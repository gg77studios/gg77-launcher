#!/usr/bin/env node
// Empacota um jogo para o GG77 Launcher: zip da pasta de build + manifesto assinado.
//
//   node scripts/make-package.mjs --dir client/dist --id idle-legends --version 1.51.0 \
//        --out ./launcher-pkg [--key ~/.config/gg77/package-signing.pem] [--min-launcher 0.3.0]
//
// Gera <out>/<id>-<versão>.zip e <out>/<id>.json. O manifesto aponta para o zip pelo nome
// (endereço relativo), então os dois arquivos vão juntos para a mesma pasta do servidor.
// A assinatura ed25519 cobre "id\nversão\nsha256"; o launcher confere com a chave pública embutida.

import { createHash, createPrivateKey, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

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

if (!/^[a-z0-9_-]+$/.test(id)) throw new Error("id inválido");
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("versão deve ser x.y.z");
if (!existsSync(join(dir, "index.html"))) throw new Error(`${dir} não tem index.html`);

mkdirSync(out, { recursive: true });
const zipName = `${id}-${version}.zip`;
const zipPath = join(out, zipName);
rmSync(zipPath, { force: true });
// -X sem atributos extras, -r recursivo, -9 compressão máxima; caminhos relativos à pasta do build
execFileSync("zip", ["-X", "-r", "-9", "-q", zipPath, "."], { cwd: dir, stdio: "inherit" });

const buf = readFileSync(zipPath);
const sha256 = createHash("sha256").update(buf).digest("hex");
const key = createPrivateKey(readFileSync(keyPath));
const signature = sign(null, Buffer.from(`${id}\n${version}\n${sha256}`), key).toString("base64");

const manifest = {
  id,
  version,
  url: zipName,
  sha256,
  size: statSync(zipPath).size,
  signature,
  ...(minLauncher ? { minLauncher } : {}),
};
writeFileSync(join(out, `${id}.json`), JSON.stringify(manifest, null, 2) + "\n");
console.log(`${zipName}  ${(manifest.size / 1048576).toFixed(1)} MB  sha256 ${sha256.slice(0, 16)}…`);
