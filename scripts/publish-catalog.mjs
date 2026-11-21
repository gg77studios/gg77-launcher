#!/usr/bin/env node
// Publica o catálogo de jogos no GitHub Pages do gg77-builds, de onde o launcher lê ao abrir
// (CATALOG_URL em src/lib/platform.ts). Jogo novo ou arte nova aparece sem lançar outro launcher.
//
//   node scripts/publish-catalog.mjs            # gera, faz commit e push no gg77-builds
//   node scripts/publish-catalog.mjs --dry-run  # só gera em ./catalog-out para conferir
//
// Fonte: CATALOG em src/lib/catalog.ts e as imagens em public/games/<id>/. Os caminhos
// "/games/<id>/..." viram "<id>/..." (relativos ao catalog.json); o launcher resolve.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "gg77studios/gg77-builds";
const dryRun = process.argv.includes("--dry-run");

const vite = await createServer({ root: ROOT, logLevel: "error", server: { middlewareMode: true } });
const { CATALOG } = await vite.ssrLoadModule("/src/lib/catalog.ts");
await vite.close();

const files = new Set();
const rewrite = (value) => {
  if (typeof value !== "string" || !value.startsWith("/games/")) return value;
  const rel = value.slice("/games/".length);
  if (!existsSync(join(ROOT, "public/games", rel))) throw new Error(`imagem não encontrada: public${value}`);
  files.add(rel);
  return rel;
};
const deep = (v) =>
  Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : rewrite(v);

const games = CATALOG.map(deep);
const catalog = { version: 1, updatedAt: new Date().toISOString(), games };

const work = dryRun ? join(ROOT, "catalog-out") : mkdtempSync(join(tmpdir(), "gg77-builds-"));
if (dryRun) rmSync(work, { recursive: true, force: true });
if (!dryRun) execFileSync("gh", ["repo", "clone", REPO, work, "--", "--depth", "1", "-q"], { stdio: "inherit" });

const out = join(work, "catalog");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const rel of files) {
  mkdirSync(dirname(join(out, rel)), { recursive: true });
  cpSync(join(ROOT, "public/games", rel), join(out, rel));
}
writeFileSync(join(out, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
// Pages sem Jekyll: serve os arquivos como estão
writeFileSync(join(work, ".nojekyll"), "");
console.log(`${games.length} jogo(s), ${files.size} imagens em ${out}`);

if (!dryRun) {
  const git = (...args) => execFileSync("git", args, { cwd: work, stdio: "inherit" });
  git("add", "-A");
  try {
    git("commit", "-q", "-m", `catalog: ${games.map((g) => g.id).join(", ")}`);
  } catch {
    console.log("catálogo sem mudanças");
    process.exit(0);
  }
  git("push", "-q", "origin", "HEAD:main");
  rmSync(work, { recursive: true, force: true });
  console.log("publicado: https://gg77studios.github.io/gg77-builds/catalog/catalog.json");
}
