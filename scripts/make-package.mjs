#!/usr/bin/env node
// Empacota um jogo para o GG77 Launcher: zip completo, patch desde a versão anterior e manifesto assinado.
//
//   node scripts/make-package.mjs --dir client/dist-launcher --id idle-legends --version 1.52.0 \
//        --out ./launcher-pkg --base-url https://github.com/gg77studios/gg77-builds/releases/download/idle-legends-v1.52.0/ \
//        [--prev ./idle-legends.prev.json] [--key ~/.config/gg77/package-signing.pem] [--min-launcher 0.4.0]
//
// Gera em <out>:
//   <id>-<versão>.zip                 o jogo inteiro (instalação nova ou salto de várias versões)
//   <id>-<versão>-from-<anterior>.zip só os arquivos novos ou alterados desde o manifesto --prev
//   <id>.json                         manifesto
// Os endereços dos zips no manifesto são <base-url><nome>; sem --base-url ficam relativos ao manifesto.
//
// Assinaturas ed25519 (o launcher confere com a chave pública embutida):
//   signature    (v1, launcher 0.3.0): "id\nversão\nsha256 do zip completo"
//   signatureV2  (launcher 0.4.0+):    "gg77-v2\nid\nversão\nsha256 do zip\n<resumo>", onde o resumo
//                é o sha256 das linhas "f\t<caminho>\t<sha256>\t<tamanho>\n" (por caminho) seguidas de
//                "p\t<de>\t<url>\t<sha256>\t<tamanho>\n" (por versão de origem). Igual a content_digest
//                em src-tauri/src/packages.rs.

import { createHash, createPrivateKey, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  console.error(`faltou --${name}`);
  process.exit(1);
}

const dir = resolve(arg("dir"));
const id = arg("id");
const version = arg("version");
const out = resolve(arg("out"));
const keyPath = arg("key", process.env.GG77_SIGNING_KEY || join(homedir(), ".config/gg77/package-signing.pem"));
const minLauncher = arg("min-launcher", "");
const baseUrl = arg("base-url", "");
const prevPath = arg("prev", "");

if (!/^[a-z0-9_-]+$/.test(id)) throw new Error("id inválido");
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("versão deve ser x.y.z");
if (!existsSync(join(dir, "index.html"))) throw new Error(`${dir} não tem index.html`);

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const byBytes = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

function walk(root, at = root) {
  const files = [];
  for (const entry of readdirSync(at, { withFileTypes: true })) {
    const full = join(at, entry.name);
    if (entry.isDirectory()) files.push(...walk(root, full));
    else if (entry.isFile()) files.push(relative(root, full).split(sep).join("/"));
  }
  return files;
}

// zip com os caminhos dados, relativos à pasta do build (-X sem atributos extras, -9 máxima)
function zipFiles(zipPath, paths) {
  rmSync(zipPath, { force: true });
  execFileSync("zip", ["-X", "-9", "-q", zipPath, "-@"], { cwd: dir, input: paths.join("\n") + "\n" });
  const buf = readFileSync(zipPath);
  return { sha256: sha256(buf), size: buf.length };
}

const files = walk(dir)
  .sort(byBytes)
  .map((path) => {
    const buf = readFileSync(join(dir, path));
    return { path, sha256: sha256(buf), size: buf.length };
  });

mkdirSync(out, { recursive: true });
const url = (name) => (baseUrl ? baseUrl.replace(/\/?$/, "/") + name : name);

const fullName = `${id}-${version}.zip`;
const full = zipFiles(join(out, fullName), files.map((f) => f.path));

const patches = [];
if (prevPath) {
  const prev = JSON.parse(readFileSync(prevPath, "utf8"));
  if (prev.id !== id) throw new Error(`--prev é do jogo ${prev.id}`);
  if (prev.version === version) throw new Error(`a versão ${version} já foi publicada`);
  if (!Array.isArray(prev.files) || !prev.files.length) {
    console.log(`manifesto anterior (${prev.version}) não tem lista de arquivos: sem patch, só o zip completo`);
  } else {
    const before = new Map(prev.files.map((f) => [f.path, f.sha256]));
    const changed = files.filter((f) => before.get(f.path) !== f.sha256).map((f) => f.path);
    if (changed.length) {
      const name = `${id}-${version}-from-${prev.version}.zip`;
      const p = zipFiles(join(out, name), changed);
      patches.push({ from: prev.version, url: url(name), sha256: p.sha256, size: p.size });
      console.log(`patch desde ${prev.version}: ${changed.length} arquivos, ${(p.size / 1024).toFixed(0)} KB`);
    }
  }
}

const key = createPrivateKey(readFileSync(keyPath));
const signB64 = (message) => sign(null, Buffer.from(message), key).toString("base64");

const digest = createHash("sha256");
for (const f of files) digest.update(`f\t${f.path}\t${f.sha256}\t${f.size}\n`);
for (const p of [...patches].sort((a, b) => byBytes(a.from, b.from))) {
  digest.update(`p\t${p.from}\t${p.url}\t${p.sha256}\t${p.size}\n`);
}

const manifest = {
  id,
  version,
  url: url(fullName),
  sha256: full.sha256,
  size: full.size,
  signature: signB64(`${id}\n${version}\n${full.sha256}`),
  ...(minLauncher ? { minLauncher } : {}),
  files,
  patches,
  signatureV2: signB64(`gg77-v2\n${id}\n${version}\n${full.sha256}\n${digest.digest("hex")}`),
};
writeFileSync(join(out, `${id}.json`), JSON.stringify(manifest, null, 2) + "\n");
console.log(`${fullName}  ${(full.size / 1048576).toFixed(1)} MB  ${files.length} arquivos  sha256 ${full.sha256.slice(0, 16)}…`);
