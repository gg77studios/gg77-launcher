#!/usr/bin/env node
// Publica a página de download (site/) na raiz do GitHub Pages do gg77-builds:
// https://gg77studios.github.io/gg77-builds/  (a pasta catalog/ de lá não é tocada).
//
//   node scripts/publish-site.mjs
//
// Os botões de download leem a última release do gg77-launcher pela API do GitHub, então lançar
// uma versão nova do launcher não exige publicar o site de novo.

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "gg77studios/gg77-builds";
const SITE = join(ROOT, "site");
const KEEP = new Set([".git", "catalog", "README.md", ".nojekyll"]);

const work = mkdtempSync(join(tmpdir(), "gg77-site-"));
execFileSync("gh", ["repo", "clone", REPO, work, "--", "--depth", "1", "-q"], { stdio: "inherit" });

// o que veio do site antes sai (arquivo renomeado não fica para trás); catálogo e README ficam
for (const name of readdirSync(work)) if (!KEEP.has(name)) rmSync(join(work, name), { recursive: true, force: true });
cpSync(SITE, work, { recursive: true });
writeFileSync(join(work, ".nojekyll"), "");

const git = (...args) => execFileSync("git", args, { cwd: work, stdio: "inherit" });
git("add", "-A");
try {
  git("commit", "-q", "-m", "site: página de download do launcher");
} catch {
  console.log("site sem mudanças");
  process.exit(0);
}
git("push", "-q", "origin", "HEAD:main");
rmSync(work, { recursive: true, force: true });
console.log("publicado: https://gg77studios.github.io/gg77-builds/");
