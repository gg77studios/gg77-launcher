//! Jogos instalados: o launcher baixa um pacote (zip) descrito por um manifesto assinado,
//! confere sha256 + assinatura ed25519, extrai numa pasta por versão e serve os arquivos
//! pelo protocolo `gg77game://localhost/<jogo>/...`.
//!
//! Manifesto v2 (launcher 0.4.0+): além do zip completo, traz a lista de arquivos com sha256 e
//! patches ("só o que mudou desde a versão X"). Quem tem a versão X instalada baixa o patch e
//! copia o resto da pasta atual; cada arquivo final é conferido contra a lista assinada. Os
//! campos v1 continuam lá, então o launcher 0.3.0 segue instalando pelo zip completo.

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use ed25519_dalek::{Signature, VerifyingKey};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, Runtime};

/// Chave pública que assina os pacotes (a privada fica fora do repositório).
const PUBLIC_KEY_B64: &str = "SWyd/L6PfJ58n5oyNUsncmbneqGxMPUG4eJv645/C/8=";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub id: String,
    pub version: String,
    /// endereço do zip; pode ser relativo ao manifesto
    pub url: String,
    pub sha256: String,
    pub size: u64,
    /// assinatura ed25519 (base64) de `id\nversion\nsha256`
    pub signature: String,
    #[serde(default)]
    pub min_launcher: Option<String>,
    /// v2: todos os arquivos da versão (caminho relativo, sha256, tamanho)
    #[serde(default)]
    pub files: Vec<FileEntry>,
    /// v2: zips só com o que mudou desde uma versão anterior
    #[serde(default)]
    pub patches: Vec<Patch>,
    /// v2: assinatura ed25519 (base64) de `signed_message_v2`, que cobre arquivos e patches
    #[serde(default)]
    pub signature_v2: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub sha256: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Patch {
    /// versão instalada que este patch atualiza
    pub from: String,
    pub url: String,
    pub sha256: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Active {
    version: String,
    sha256: String,
    installed_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStatus {
    pub installed: Option<String>,
    pub latest: Option<String>,
    pub size: Option<u64>,
    pub update_available: bool,
    /// erro ao consultar o manifesto (sem internet, servidor fora...)
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Progress {
    game_id: String,
    phase: &'static str,
    received: u64,
    total: u64,
}

pub fn slug(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .take(48)
        .collect()
}

/// Nome de pasta para uma versão: mantém os pontos (1.10.0 e 11.0.0 não podem colidir).
fn version_dir(version: &str) -> String {
    version
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        .take(32)
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

fn game_dir<R: Runtime>(app: &AppHandle<R>, id: &str) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("games").join(slug(id)))
}

fn read_active(dir: &Path) -> Option<Active> {
    let raw = fs::read(dir.join("active.json")).ok()?;
    serde_json::from_slice(&raw).ok()
}

/// Pasta da versão ativa de um jogo instalado.
pub fn active_root<R: Runtime>(app: &AppHandle<R>, id: &str) -> Option<PathBuf> {
    let dir = game_dir(app, id).ok()?;
    let active = read_active(&dir)?;
    let root = dir.join("versions").join(version_dir(&active.version));
    root.is_dir().then_some(root)
}

pub fn signed_message(m: &Manifest) -> String {
    format!("{}\n{}\n{}", m.id, m.version, m.sha256.to_lowercase())
}

/// Resumo da lista de arquivos e patches, em texto canônico (o empacotador em Node gera o
/// mesmo): linhas `f\t<caminho>\t<sha256>\t<tamanho>` ordenadas por caminho, depois
/// `p\t<de>\t<url>\t<sha256>\t<tamanho>` ordenadas pela versão de origem.
pub fn content_digest(m: &Manifest) -> String {
    let mut files: Vec<&FileEntry> = m.files.iter().collect();
    files.sort_by(|a, b| a.path.as_bytes().cmp(b.path.as_bytes()));
    let mut patches: Vec<&Patch> = m.patches.iter().collect();
    patches.sort_by(|a, b| a.from.as_bytes().cmp(b.from.as_bytes()));
    let mut h = Sha256::new();
    for f in files {
        h.update(format!("f\t{}\t{}\t{}\n", f.path, f.sha256.to_lowercase(), f.size));
    }
    for p in patches {
        h.update(format!("p\t{}\t{}\t{}\t{}\n", p.from, p.url, p.sha256.to_lowercase(), p.size));
    }
    hex::encode(h.finalize())
}

pub fn signed_message_v2(m: &Manifest) -> String {
    format!("gg77-v2\n{}\n{}\n{}\n{}", m.id, m.version, m.sha256.to_lowercase(), content_digest(m))
}

fn verify_bytes(message: &str, signature_b64: &str, public_key_b64: &str) -> Result<(), String> {
    let key_bytes: [u8; 32] = B64
        .decode(public_key_b64)
        .map_err(|_| "chave pública inválida")?
        .try_into()
        .map_err(|_| "chave pública com tamanho errado")?;
    let key = VerifyingKey::from_bytes(&key_bytes).map_err(|_| "chave pública inválida")?;
    let sig_bytes: [u8; 64] = B64
        .decode(signature_b64.trim())
        .map_err(|_| "assinatura ilegível")?
        .try_into()
        .map_err(|_| "assinatura com tamanho errado")?;
    let sig = Signature::from_bytes(&sig_bytes);
    key.verify_strict(message.as_bytes(), &sig)
        .map_err(|_| "assinatura do pacote não confere".to_string())
}

/// Confere a assinatura certa: v2 quando o manifesto traz arquivos ou patches (eles só valem
/// assinados), senão a v1 (só o zip completo).
pub fn verify_signature(m: &Manifest, public_key_b64: &str) -> Result<(), String> {
    match &m.signature_v2 {
        Some(sig) => verify_bytes(&signed_message_v2(m), sig, public_key_b64),
        None if !m.files.is_empty() || !m.patches.is_empty() => {
            Err("manifesto com lista de arquivos sem assinatura v2".into())
        }
        None => verify_bytes(&signed_message(m), &m.signature, public_key_b64),
    }
}

/// Compara versões x.y.z (partes que faltam contam como 0).
pub fn version_lt(a: &str, b: &str) -> bool {
    let parse = |v: &str| -> Vec<u64> { v.split('.').map(|p| p.trim().parse().unwrap_or(0)).collect() };
    let (pa, pb) = (parse(a), parse(b));
    for i in 0..pa.len().max(pb.len()) {
        let (x, y) = (pa.get(i).copied().unwrap_or(0), pb.get(i).copied().unwrap_or(0));
        if x != y {
            return x < y;
        }
    }
    false
}

/// Baixa o manifesto; devolve também o endereço dele, base dos endereços relativos.
async fn fetch_manifest(url: &str) -> Result<(Manifest, reqwest::Url), String> {
    let base = reqwest::Url::parse(url).map_err(|_| "endereço do manifesto inválido")?;
    let text = reqwest::get(base.clone())
        .await
        .map_err(|e| format!("sem conexão com o servidor do jogo ({e})"))?
        .error_for_status()
        .map_err(|e| format!("manifesto indisponível ({e})"))?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    let m: Manifest = serde_json::from_str(&text).map_err(|_| "manifesto em formato inválido")?;
    Ok((m, base))
}

fn resolve(base: &reqwest::Url, url: &str) -> Result<reqwest::Url, String> {
    base.join(url).map_err(|_| "endereço do pacote inválido".to_string())
}

/// Patch que leva da versão instalada à do manifesto, se houver um e a lista de arquivos vier junto.
fn patch_for<'a>(m: &'a Manifest, installed: Option<&str>) -> Option<&'a Patch> {
    let from = installed?;
    if m.files.is_empty() {
        return None;
    }
    m.patches.iter().find(|p| p.from == from)
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// Caminho seguro dentro do pacote (sem `..`, sem raiz absoluta).
fn safe_relative(path: &str) -> Option<PathBuf> {
    let p = Path::new(path);
    let mut out = PathBuf::new();
    for c in p.components() {
        match c {
            Component::Normal(s) => out.push(s),
            Component::CurDir => {}
            _ => return None,
        }
    }
    (!out.as_os_str().is_empty()).then_some(out)
}

/// Extrai o zip completo para `dest` (precisa ter index.html), devolvendo o sha256 de cada arquivo.
pub fn extract_zip(zip_path: &Path, dest: &Path) -> Result<BTreeMap<String, String>, String> {
    let hashes = extract_files(zip_path, dest)?;
    if !dest.join("index.html").is_file() {
        return Err("pacote sem index.html".into());
    }
    Ok(hashes)
}

/// Extrai qualquer zip do jogo (completo ou patch) para `dest`, com proteção contra zip-slip.
fn extract_files(zip_path: &Path, dest: &Path) -> Result<BTreeMap<String, String>, String> {
    let file = fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|_| "pacote corrompido")?;
    let mut hashes = BTreeMap::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|_| "pacote corrompido")?;
        let name = entry.name().map_err(|_| "nome de arquivo inválido no pacote")?.to_string();
        let Some(rel) = safe_relative(&name) else {
            return Err(format!("caminho inválido no pacote: {name}"));
        };
        let out = dest.join(&rel);
        if entry.is_dir() {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = out.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut buf = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut buf).map_err(|_| "pacote corrompido")?;
        fs::write(&out, &buf).map_err(|e| e.to_string())?;
        let key = rel.to_string_lossy().replace('\\', "/");
        hashes.insert(key, hex::encode(Sha256::digest(&buf)));
    }
    Ok(hashes)
}

/// A pasta extraída tem exatamente os arquivos da lista assinada, com os mesmos sha256?
fn check_against_list(hashes: &BTreeMap<String, String>, files: &[FileEntry]) -> Result<(), String> {
    if hashes.len() != files.len() {
        return Err("o pacote não tem os mesmos arquivos da lista assinada".into());
    }
    for f in files {
        match hashes.get(&f.path) {
            Some(h) if h.eq_ignore_ascii_case(&f.sha256) => {}
            _ => return Err(format!("arquivo não confere com a lista assinada: {}", f.path)),
        }
    }
    Ok(())
}

/// Monta a versão nova em `dest`: arquivos do patch + o resto copiado da versão instalada
/// (`old_root`). Cada arquivo final é conferido contra a lista assinada; arquivos que saíram
/// da versão simplesmente não são copiados. Devolve o sha256 de cada arquivo.
pub fn apply_patch(old_root: &Path, patch_zip: &Path, files: &[FileEntry], dest: &Path) -> Result<BTreeMap<String, String>, String> {
    let from_patch = extract_files(patch_zip, dest)?;
    let wanted: BTreeMap<&str, &FileEntry> = files.iter().map(|f| (f.path.as_str(), f)).collect();
    if let Some(extra) = from_patch.keys().find(|k| !wanted.contains_key(k.as_str())) {
        return Err(format!("o patch traz um arquivo fora da lista: {extra}"));
    }
    let mut hashes = BTreeMap::new();
    for f in files {
        let rel = safe_relative(&f.path).ok_or_else(|| format!("caminho inválido na lista: {}", f.path))?;
        let out = dest.join(&rel);
        let hash = match from_patch.get(&f.path) {
            Some(h) => h.clone(),
            None => {
                let src = old_root.join(&rel);
                if let Some(parent) = out.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                // hardlink é instantâneo; em outro disco ou sistema sem suporte, copia
                if fs::hard_link(&src, &out).is_err() {
                    fs::copy(&src, &out).map_err(|_| format!("arquivo da versão instalada sumiu: {}", f.path))?;
                }
                let buf = fs::read(&out).map_err(|e| e.to_string())?;
                hex::encode(Sha256::digest(&buf))
            }
        };
        if !hash.eq_ignore_ascii_case(&f.sha256) {
            return Err(format!("arquivo não confere depois do patch: {}", f.path));
        }
        hashes.insert(f.path.clone(), hash);
    }
    if !dest.join("index.html").is_file() {
        return Err("versão sem index.html".into());
    }
    Ok(hashes)
}

/// Baixa `url` para `part`, retomando de onde parou se o arquivo parcial já existir e o
/// servidor aceitar Range. Confere sha256 do arquivo inteiro no fim.
async fn download<R: Runtime>(
    app: &AppHandle<R>,
    game_id: &str,
    url: reqwest::Url,
    part: &Path,
    sha256: &str,
    size: u64,
) -> Result<u64, String> {
    let mut hasher = Sha256::new();
    let mut received: u64 = 0;
    if let Ok(existing) = fs::read(part) {
        if (existing.len() as u64) < size {
            hasher.update(&existing);
            received = existing.len() as u64;
        }
    }
    let client = reqwest::Client::new();
    let mut req = client.get(url.clone());
    if received > 0 {
        req = req.header(reqwest::header::RANGE, format!("bytes={received}-"));
    }
    let resp = req
        .send()
        .await
        .map_err(|e| format!("falha ao baixar ({e})"))?
        .error_for_status()
        .map_err(|e| format!("pacote indisponível ({e})"))?;
    // sem 206 o servidor mandou o arquivo inteiro: recomeça do zero
    let mut file = if received > 0 && resp.status() == reqwest::StatusCode::PARTIAL_CONTENT {
        fs::OpenOptions::new().append(true).open(part).map_err(|e| e.to_string())?
    } else {
        hasher = Sha256::new();
        received = 0;
        fs::File::create(part).map_err(|e| e.to_string())?
    };
    let total = size.max(received + resp.content_length().unwrap_or(0));
    let mut last = Instant::now();
    let mut stream = resp.bytes_stream();
    emit_progress(app, game_id, "download", received, total);
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("download interrompido ({e}); clique de novo para continuar"))?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        hasher.update(&chunk);
        received += chunk.len() as u64;
        if last.elapsed().as_millis() > 150 {
            emit_progress(app, game_id, "download", received, total);
            last = Instant::now();
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    drop(file);
    let digest = hex::encode(hasher.finalize());
    if !digest.eq_ignore_ascii_case(sha256.trim()) {
        let _ = fs::remove_file(part);
        return Err("o arquivo baixado não confere (sha256); tente de novo".into());
    }
    Ok(received)
}

/// Grava a lista de hashes, troca a pasta temporária pela final e ativa a versão.
fn finish_install(dir: &Path, tmp: &Path, version: &str, sha256: &str, hashes: &BTreeMap<String, String>) -> Result<(), String> {
    fs::write(tmp.join(".gg77-files.json"), serde_json::to_vec(hashes).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let final_dir = dir.join("versions").join(version_dir(version));
    let _ = fs::remove_dir_all(&final_dir);
    fs::rename(tmp, &final_dir).map_err(|e| e.to_string())?;
    activate(dir, version, sha256)
}

/// Torna `version` a versão ativa e apaga as outras (escrita atômica do active.json).
fn activate(dir: &Path, version: &str, sha256: &str) -> Result<(), String> {
    let active = Active { version: version.to_string(), sha256: sha256.to_string(), installed_at: now() };
    let tmp = dir.join("active.json.tmp");
    fs::write(&tmp, serde_json::to_vec_pretty(&active).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    fs::rename(&tmp, dir.join("active.json")).map_err(|e| e.to_string())?;
    if let Ok(entries) = fs::read_dir(dir.join("versions")) {
        for e in entries.flatten() {
            if e.file_name().to_string_lossy() != version_dir(version) {
                let _ = fs::remove_dir_all(e.path());
            }
        }
    }
    Ok(())
}

fn emit_progress<R: Runtime>(app: &AppHandle<R>, game_id: &str, phase: &'static str, received: u64, total: u64) {
    let _ = app.emit_to(
        "main",
        "package-progress",
        Progress { game_id: game_id.to_string(), phase, received, total },
    );
}

#[tauri::command]
pub async fn check_game<R: Runtime>(app: AppHandle<R>, game_id: String, manifest_url: String) -> Result<GameStatus, String> {
    let dir = game_dir(&app, &game_id)?;
    let installed = read_active(&dir).map(|a| a.version).filter(|_| active_root(&app, &game_id).is_some());
    match fetch_manifest(&manifest_url).await {
        Ok((m, _)) => Ok(GameStatus {
            update_available: installed.as_deref().is_some_and(|v| version_lt(v, &m.version)),
            // atualização por patch baixa só o que mudou
            size: Some(patch_for(&m, installed.as_deref()).map_or(m.size, |p| p.size)),
            installed,
            latest: Some(m.version),
            error: None,
        }),
        Err(e) => Ok(GameStatus { installed, latest: None, size: None, update_available: false, error: Some(e) }),
    }
}

#[tauri::command]
pub async fn install_game<R: Runtime>(app: AppHandle<R>, game_id: String, manifest_url: String) -> Result<String, String> {
    let (m, base) = fetch_manifest(&manifest_url).await?;
    if slug(&m.id) != slug(&game_id) {
        return Err("o manifesto é de outro jogo".into());
    }
    // a assinatura cobre id, versão, sha256 do zip e (v2) cada arquivo e patch: confere antes
    // de baixar qualquer coisa
    verify_signature(&m, PUBLIC_KEY_B64)?;
    if let Some(min) = &m.min_launcher {
        let mine = app.package_info().version.to_string();
        if version_lt(&mine, min) {
            return Err(format!("esta versão do jogo pede o launcher {min} ou mais novo"));
        }
    }

    let dir = game_dir(&app, &game_id)?;
    fs::create_dir_all(dir.join("versions")).map_err(|e| e.to_string())?;
    let installed = read_active(&dir).map(|a| a.version).filter(|_| active_root(&app, &game_id).is_some());

    if let (Some(p), Some(old_root)) = (patch_for(&m, installed.as_deref()), active_root(&app, &game_id)) {
        match install_patch(&app, &game_id, &m, &base, p, &dir, old_root).await {
            Ok(()) => {
                #[cfg(debug_assertions)]
                eprintln!("[gg77] {game_id}: patch {} -> {} aplicado ({} bytes)", p.from, m.version, p.size);
                return Ok(m.version);
            }
            // patch falhou (arquivo local mexido, patch corrompido...): segue pelo zip completo
            Err(e) => eprintln!("[gg77] patch {} -> {} falhou: {e}; baixando o jogo completo", p.from, m.version),
        }
    }

    let part = dir.join(format!("full-{}.zip.part", &m.sha256.get(..16).unwrap_or("x")));
    let received = download(&app, &game_id, resolve(&base, &m.url)?, &part, &m.sha256, m.size).await?;

    emit_progress(&app, &game_id, "extract", received, received);
    let (version, sha, files) = (m.version.clone(), m.sha256.to_lowercase(), m.files.clone());
    let (dir2, part2) = (dir.clone(), part.clone());
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let tmp = dir2.join("versions").join(format!("{}.tmp", version_dir(&version)));
        let _ = fs::remove_dir_all(&tmp);
        let result = extract_zip(&part2, &tmp).and_then(|hashes| {
            if !files.is_empty() {
                check_against_list(&hashes, &files)?;
            }
            finish_install(&dir2, &tmp, &version, &sha, &hashes)
        });
        if result.is_err() {
            let _ = fs::remove_dir_all(&tmp);
        }
        let _ = fs::remove_file(&part2);
        result
    })
    .await
    .map_err(|e| e.to_string())??;

    emit_progress(&app, &game_id, "done", received, received);
    Ok(m.version)
}

async fn install_patch<R: Runtime>(
    app: &AppHandle<R>,
    game_id: &str,
    m: &Manifest,
    base: &reqwest::Url,
    p: &Patch,
    dir: &Path,
    old_root: PathBuf,
) -> Result<(), String> {
    let part = dir.join(format!("patch-{}.zip.part", &p.sha256.get(..16).unwrap_or("x")));
    let received = download(app, game_id, resolve(base, &p.url)?, &part, &p.sha256, p.size).await?;
    emit_progress(app, game_id, "extract", received, received);
    let (version, sha, files) = (m.version.clone(), m.sha256.to_lowercase(), m.files.clone());
    let (dir2, part2) = (dir.to_path_buf(), part.clone());
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let tmp = dir2.join("versions").join(format!("{}.tmp", version_dir(&version)));
        let _ = fs::remove_dir_all(&tmp);
        let result = apply_patch(&old_root, &part2, &files, &tmp)
            .and_then(|hashes| finish_install(&dir2, &tmp, &version, &sha, &hashes));
        if result.is_err() {
            let _ = fs::remove_dir_all(&tmp);
        }
        let _ = fs::remove_file(&part2);
        result
    })
    .await
    .map_err(|e| e.to_string())??;
    emit_progress(app, game_id, "done", received, received);
    Ok(())
}

#[tauri::command]
pub fn uninstall_game<R: Runtime>(app: AppHandle<R>, game_id: String) -> Result<(), String> {
    let dir = game_dir(&app, &game_id)?;
    match fs::remove_dir_all(&dir) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Recalcula o sha256 de cada arquivo instalado; devolve os que não conferem.
#[tauri::command]
pub async fn verify_game<R: Runtime>(app: AppHandle<R>, game_id: String) -> Result<Vec<String>, String> {
    let root = active_root(&app, &game_id).ok_or("jogo não instalado")?;
    tauri::async_runtime::spawn_blocking(move || {
        let raw = fs::read(root.join(".gg77-files.json")).map_err(|_| "lista de arquivos ausente")?;
        let hashes: BTreeMap<String, String> = serde_json::from_slice(&raw).map_err(|_| "lista de arquivos corrompida")?;
        let mut bad = Vec::new();
        for (rel, expected) in hashes {
            match fs::read(root.join(&rel)) {
                Ok(buf) if hex::encode(Sha256::digest(&buf)) == expected => {}
                _ => bad.push(rel),
            }
        }
        Ok(bad)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn mime_for(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).as_deref() {
        Some("html") => "text/html; charset=utf-8",
        Some("js" | "mjs") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("ttf") => "font/ttf",
        Some("mp3") => "audio/mpeg",
        Some("ogg" | "opus") => "audio/ogg",
        Some("wav") => "audio/wav",
        Some("m4a") => "audio/mp4",
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("wasm") => "application/wasm",
        _ => "application/octet-stream",
    }
}

/// Resposta do protocolo `gg77game`: `/<jogo>/<caminho>` dentro da versão ativa.
/// Caminho sem extensão que não existe cai no index.html (rotas de SPA).
pub fn serve<R: Runtime>(app: &AppHandle<R>, path: &str) -> (u16, &'static str, Vec<u8>) {
    let decoded = percent_decode(path);
    let mut parts = decoded.trim_start_matches('/').splitn(2, '/');
    let game = parts.next().unwrap_or_default();
    let rest = parts.next().unwrap_or("").split(['?', '#']).next().unwrap_or("");
    let Some(root) = active_root(app, game) else {
        return (404, "text/plain; charset=utf-8", b"jogo nao instalado".to_vec());
    };
    let rel = if rest.is_empty() { PathBuf::from("index.html") } else {
        match safe_relative(rest) {
            Some(p) => p,
            None => return (400, "text/plain; charset=utf-8", b"caminho invalido".to_vec()),
        }
    };
    let mut file = root.join(&rel);
    if !file.is_file() {
        if rel.extension().is_some() {
            return (404, "text/plain; charset=utf-8", b"nao encontrado".to_vec());
        }
        file = root.join("index.html");
    }
    match fs::read(&file) {
        Ok(buf) => (200, mime_for(&file), buf),
        Err(_) => (404, "text/plain; charset=utf-8", b"nao encontrado".to_vec()),
    }
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn signed(m: &mut Manifest, key: &SigningKey) {
        m.signature = B64.encode(key.sign(signed_message(m).as_bytes()).to_bytes());
    }

    fn manifest() -> Manifest {
        Manifest {
            id: "idle-legends".into(),
            version: "1.2.3".into(),
            url: "idle.zip".into(),
            sha256: "ab".repeat(32),
            size: 10,
            signature: String::new(),
            min_launcher: None,
            files: Vec::new(),
            patches: Vec::new(),
            signature_v2: None,
        }
    }

    fn sha(b: &[u8]) -> String {
        hex::encode(Sha256::digest(b))
    }

    fn entry(path: &str, body: &[u8]) -> FileEntry {
        FileEntry { path: path.into(), sha256: sha(body), size: body.len() as u64 }
    }

    fn write_zip(path: &Path, files: &[(&str, &[u8])]) {
        let mut z = zip::ZipWriter::new(fs::File::create(path).unwrap());
        let opts = zip::write::SimpleFileOptions::default();
        for (name, body) in files {
            z.start_file(*name, opts).unwrap();
            z.write_all(body).unwrap();
        }
        z.finish().unwrap();
    }

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("gg77-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn signature_v2_covers_files_and_patches() {
        let key = SigningKey::from_bytes(&[7u8; 32]);
        let pub_b64 = B64.encode(key.verifying_key().to_bytes());
        let mut m = manifest();
        m.files = vec![entry("index.html", b"<html>"), entry("assets/a.js", b"1")];
        m.patches = vec![Patch { from: "1.2.2".into(), url: "p.zip".into(), sha256: "ef".repeat(32), size: 3 }];
        m.signature_v2 = Some(B64.encode(key.sign(signed_message_v2(&m).as_bytes()).to_bytes()));
        assert!(verify_signature(&m, &pub_b64).is_ok());
        // a ordem da lista não muda o resumo
        let mut reordered = m.clone();
        reordered.files.reverse();
        assert!(verify_signature(&reordered, &pub_b64).is_ok());
        let mut other = m.clone();
        other.files[1].sha256 = "00".repeat(32);
        assert!(verify_signature(&other, &pub_b64).is_err());
        let mut other = m.clone();
        other.patches[0].url = "https://evil/p.zip".into();
        assert!(verify_signature(&other, &pub_b64).is_err());
        // lista de arquivos sem assinatura v2 não vale, mesmo com a v1 certa
        let mut unsigned = m.clone();
        unsigned.signature_v2 = None;
        signed(&mut unsigned, &key);
        assert!(verify_signature(&unsigned, &pub_b64).is_err());
    }

    #[test]
    fn patch_only_for_the_installed_version() {
        let mut m = manifest();
        m.patches = vec![Patch { from: "1.2.2".into(), url: "p.zip".into(), sha256: "ef".repeat(32), size: 3 }];
        // sem lista de arquivos não há como conferir o resultado: nada de patch
        assert!(patch_for(&m, Some("1.2.2")).is_none());
        m.files = vec![entry("index.html", b"<html>")];
        assert!(patch_for(&m, Some("1.2.2")).is_some());
        assert!(patch_for(&m, Some("1.2.0")).is_none());
        assert!(patch_for(&m, None).is_none());
    }

    #[test]
    fn applies_patch_and_refuses_tampering() {
        let dir = temp("patch");
        let old = dir.join("old");
        fs::create_dir_all(old.join("assets")).unwrap();
        fs::write(old.join("index.html"), b"<html>1</html>").unwrap();
        fs::write(old.join("assets/music.mp3"), b"MUSIC").unwrap();
        fs::write(old.join("assets/app-1.js"), b"v1").unwrap();
        fs::write(old.join("assets/gone.png"), b"old art").unwrap();

        // versão nova: index e js mudam, música fica, gone.png sai
        let files = vec![
            entry("index.html", b"<html>2</html>"),
            entry("assets/app-2.js", b"v2"),
            entry("assets/music.mp3", b"MUSIC"),
        ];
        let patch = dir.join("patch.zip");
        write_zip(&patch, &[("index.html", b"<html>2</html>"), ("assets/app-2.js", b"v2")]);
        let out = dir.join("new");
        let hashes = apply_patch(&old, &patch, &files, &out).unwrap();
        assert_eq!(hashes.len(), 3);
        assert_eq!(fs::read(out.join("assets/music.mp3")).unwrap(), b"MUSIC");
        assert_eq!(fs::read(out.join("index.html")).unwrap(), b"<html>2</html>");
        assert!(!out.join("assets/gone.png").exists());
        assert!(!out.join("assets/app-1.js").exists());

        // arquivo local alterado: a cópia não confere com a lista
        fs::write(old.join("assets/music.mp3"), b"HACKED").unwrap();
        assert!(apply_patch(&old, &patch, &files, &dir.join("new2")).is_err());

        // patch com arquivo fora da lista
        fs::write(old.join("assets/music.mp3"), b"MUSIC").unwrap();
        let evil = dir.join("evil.zip");
        write_zip(&evil, &[("index.html", b"<html>2</html>"), ("assets/app-2.js", b"v2"), ("cheat.js", b"x")]);
        assert!(apply_patch(&old, &evil, &files, &dir.join("new3")).is_err());

        // patch com conteúdo diferente do assinado
        let wrong = dir.join("wrong.zip");
        write_zip(&wrong, &[("index.html", b"<html>X</html>"), ("assets/app-2.js", b"v2")]);
        assert!(apply_patch(&old, &wrong, &files, &dir.join("new4")).is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn full_zip_must_match_the_list() {
        let mut hashes = BTreeMap::new();
        hashes.insert("index.html".to_string(), sha(b"<html>"));
        let files = vec![entry("index.html", b"<html>")];
        assert!(check_against_list(&hashes, &files).is_ok());
        hashes.insert("extra.js".to_string(), sha(b"x"));
        assert!(check_against_list(&hashes, &files).is_err());
    }

    #[test]
    fn signature_valid_and_tampered() {
        let key = SigningKey::from_bytes(&[7u8; 32]);
        let pub_b64 = B64.encode(key.verifying_key().to_bytes());
        let mut m = manifest();
        signed(&mut m, &key);
        assert!(verify_signature(&m, &pub_b64).is_ok());
        let mut other = m.clone();
        other.version = "9.9.9".into();
        assert!(verify_signature(&other, &pub_b64).is_err());
        let mut other = m.clone();
        other.sha256 = "cd".repeat(32);
        assert!(verify_signature(&other, &pub_b64).is_err());
        // assinado por outra chave
        let stranger = SigningKey::from_bytes(&[9u8; 32]);
        let mut forged = manifest();
        signed(&mut forged, &stranger);
        assert!(verify_signature(&forged, &pub_b64).is_err());
    }

    #[test]
    fn versions_compare() {
        assert!(version_lt("1.50.3", "1.51.0"));
        assert!(version_lt("0.2", "0.2.1"));
        assert!(!version_lt("1.10.0", "1.9.9"));
        assert!(!version_lt("1.0.0", "1.0.0"));
    }

    #[test]
    fn rejects_unsafe_paths() {
        assert!(safe_relative("../etc/passwd").is_none());
        assert!(safe_relative("/abs").is_none());
        assert!(safe_relative("a/../../b").is_none());
        assert_eq!(safe_relative("assets/x.js").unwrap(), PathBuf::from("assets/x.js"));
    }

    #[test]
    fn extracts_and_blocks_zip_slip() {
        let dir = std::env::temp_dir().join(format!("gg77-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let good = dir.join("good.zip");
        {
            let mut z = zip::ZipWriter::new(fs::File::create(&good).unwrap());
            let opts = zip::write::SimpleFileOptions::default();
            z.start_file("index.html", opts).unwrap();
            z.write_all(b"<html></html>").unwrap();
            z.start_file("assets/app.js", opts).unwrap();
            z.write_all(b"console.log(1)").unwrap();
            z.finish().unwrap();
        }
        let out = dir.join("out");
        let hashes = extract_zip(&good, &out).unwrap();
        assert_eq!(hashes.len(), 2);
        assert!(out.join("assets/app.js").is_file());

        let evil = dir.join("evil.zip");
        {
            let mut z = zip::ZipWriter::new(fs::File::create(&evil).unwrap());
            let opts = zip::write::SimpleFileOptions::default();
            z.start_file("../escape.txt", opts).unwrap();
            z.write_all(b"x").unwrap();
            z.finish().unwrap();
        }
        assert!(extract_zip(&evil, &dir.join("out2")).is_err());
        assert!(!dir.join("escape.txt").exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn version_folders_do_not_collide() {
        assert_eq!(version_dir("1.10.0"), "1.10.0");
        assert_ne!(version_dir("1.10.0"), version_dir("11.0.0"));
        assert_eq!(version_dir("../1.0.0"), "/1.0.0".trim_start_matches('/').to_string());
        assert!(!version_dir("../../x").contains('/'));
    }

    #[test]
    fn decodes_percent() {
        assert_eq!(percent_decode("/idle/a%20b.png"), "/idle/a b.png");
        assert_eq!(percent_decode("/x%2"), "/x%2");
    }
}
