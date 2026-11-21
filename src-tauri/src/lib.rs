mod packages;

use serde::Serialize;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

/// Script injetado em toda página aberta numa janela de jogo: expõe `window.GG77`.
const SDK: &str = include_str!("sdk.js");

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionEvent {
    game_id: String,
    seconds: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UnlockEvent {
    game_id: String,
    id: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameEvent {
    game_id: String,
}

use packages::slug;

fn clip(value: Option<String>, max: usize) -> Option<String> {
    value.map(|v| v.chars().take(max).collect())
}

/// Abre a janela do jogo (ou foca a que já está aberta) e mede a sessão.
fn open_game_window(app: &AppHandle, id: &str, url: WebviewUrl, title: &str) -> Result<(), String> {
    let label = format!("game-{id}");
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(app, &label, url)
        .title(title)
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 560.0)
        .initialization_script(SDK)
        .build()
        .map_err(|e| e.to_string())?;

    let started = Instant::now();
    let handle = app.clone();
    let gid = id.to_string();
    window.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            #[cfg(debug_assertions)]
            eprintln!("[gg77] sessão encerrada: {gid} ({} s)", started.elapsed().as_secs());
            let _ = handle.emit_to(
                "main",
                "game-closed",
                SessionEvent { game_id: gid.clone(), seconds: started.elapsed().as_secs() },
            );
        }
    });

    let _ = app.emit_to("main", "game-started", id.to_string());
    Ok(())
}

/// Jogo publicado na web: abre o endereço numa janela própria.
#[tauri::command]
fn launch_game(app: AppHandle, game_id: String, url: String, title: String) -> Result<(), String> {
    let id = slug(&game_id);
    if id.is_empty() {
        return Err("id de jogo inválido".into());
    }
    let parsed: Url = url.parse().map_err(|_| "endereço do jogo inválido".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("o endereço precisa começar com http ou https".into());
    }
    open_game_window(&app, &id, WebviewUrl::External(parsed), &title)
}

/// Jogo instalado: abre a versão ativa pelo protocolo `gg77game`.
#[tauri::command]
fn launch_installed_game(app: AppHandle, game_id: String, title: String) -> Result<(), String> {
    let id = slug(&game_id);
    if packages::active_root(&app, &id).is_none() {
        return Err("o jogo não está instalado".into());
    }
    let url: Url = format!("gg77game://localhost/{id}/index.html").parse().map_err(|_| "endereço inválido".to_string())?;
    open_game_window(&app, &id, WebviewUrl::CustomProtocol(url), &title)
}

#[tauri::command]
fn close_game(app: AppHandle, game_id: String) {
    if let Some(w) = app.get_webview_window(&format!("game-{}", slug(&game_id))) {
        let _ = w.close();
    }
}

fn game_of(window: &WebviewWindow) -> Result<String, String> {
    window
        .label()
        .strip_prefix("game-")
        .map(str::to_string)
        .ok_or_else(|| "só janelas de jogo podem chamar isso".to_string())
}

/// Chamado pelo jogo (via `window.GG77.unlock`). O jogo é identificado pela janela,
/// então uma página não consegue liberar conquista de outro jogo.
#[tauri::command]
fn unlock_achievement(
    window: WebviewWindow,
    id: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
) -> Result<(), String> {
    let game_id = game_of(&window)?;
    let id = slug(&id);
    if id.is_empty() {
        return Err("id de conquista inválido".into());
    }
    #[cfg(debug_assertions)]
    eprintln!("[gg77] conquista recebida: {game_id}/{id}");
    window
        .app_handle()
        .emit_to(
            "main",
            "achievement-unlocked",
            UnlockEvent {
                game_id,
                id,
                title: clip(title, 80),
                description: clip(description, 200),
                icon: clip(icon, 500),
            },
        )
        .map_err(|e| e.to_string())
}

/// O jogo avisa que precisa de versão nova (`window.GG77.requestUpdate()`);
/// a janela principal fecha o jogo, atualiza e abre de novo.
#[tauri::command]
fn request_game_update(window: WebviewWindow) -> Result<(), String> {
    let game_id = game_of(&window)?;
    #[cfg(debug_assertions)]
    eprintln!("[gg77] atualização pedida por {game_id}");
    window
        .app_handle()
        .emit_to("main", "game-update-requested", GameEvent { game_id })
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        // arquivos dos jogos instalados: gg77game://localhost/<jogo>/<caminho>
        // (no Windows o WebView2 expõe como http://gg77game.localhost/<jogo>/<caminho>)
        .register_asynchronous_uri_scheme_protocol("gg77game", |ctx, request, responder| {
            let app = ctx.app_handle().clone();
            let path = request.uri().path().to_string();
            std::thread::spawn(move || {
                let (status, mime, body) = packages::serve(&app, &path);
                let response = tauri::http::Response::builder()
                    .status(status)
                    .header("Content-Type", mime)
                    .header("Cache-Control", "no-cache")
                    .body(body)
                    .expect("resposta válida");
                responder.respond(response);
            });
        })
        .invoke_handler(tauri::generate_handler![
            launch_game,
            launch_installed_game,
            close_game,
            unlock_achievement,
            request_game_update,
            packages::check_game,
            packages::install_game,
            packages::uninstall_game,
            packages::verify_game,
        ])
        .setup(|_app| {
            // Autotestes (só em desenvolvimento):
            // GG77_AUTOTEST_URL=<página> abre a página como jogo e fecha depois de 8 s.
            // GG77_AUTOTEST_MANIFEST=<manifesto> instala o pacote do jogo "autoteste" e abre a versão instalada.
            #[cfg(debug_assertions)]
            {
                let app = _app.handle().clone();
                if let Ok(url) = std::env::var("GG77_AUTOTEST_URL") {
                    tauri::async_runtime::spawn(async move {
                        std::thread::sleep(std::time::Duration::from_secs(4));
                        let r = launch_game(app.clone(), "autoteste".into(), url, "Autoteste".into());
                        eprintln!("[gg77] autoteste: janela aberta {r:?}");
                        std::thread::sleep(std::time::Duration::from_secs(8));
                        close_game(app, "autoteste".into());
                        eprintln!("[gg77] autoteste: janela fechada");
                    });
                } else if let Ok(manifest) = std::env::var("GG77_AUTOTEST_MANIFEST") {
                    tauri::async_runtime::spawn(async move {
                        std::thread::sleep(std::time::Duration::from_secs(4));
                        let r = packages::install_game(app.clone(), "autoteste".into(), manifest).await;
                        eprintln!("[gg77] autoteste: instalação {r:?}");
                        let r = launch_installed_game(app.clone(), "autoteste".into(), "Autoteste".into());
                        eprintln!("[gg77] autoteste: janela aberta {r:?}");
                        std::thread::sleep(std::time::Duration::from_secs(8));
                        close_game(app, "autoteste".into());
                        eprintln!("[gg77] autoteste: janela fechada");
                    });
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o launcher");
}
