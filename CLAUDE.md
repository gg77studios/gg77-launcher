# CLAUDE.md: GG77 Launcher e jogos da GG77

Instruções para sessões do Claude neste repositório. Vale para dois tipos de trabalho: mexer no
launcher e **criar ou integrar um jogo novo**. O guia para pessoas, com os detalhes de cada passo, está em
[docs/NOVO-JOGO.md](docs/NOVO-JOGO.md); o SDK em [docs/SDK.md](docs/SDK.md). O Idle Legends é a
referência completa de jogo integrado.

## Mapa do ecossistema

| Peça | Onde | O que é |
|---|---|---|
| Launcher | `gg77studios/gg77-launcher` (público) | Tauri v2 + React. Biblioteca, instalação de jogos, conta GG77, amigos, SDK `window.GG77` |
| Builds e catálogo | `gg77studios/gg77-builds` (público) | Só releases + GitHub Pages: pacotes dos jogos, release `catalog` (manifestos), `catalog/catalog.json`, página de download |
| Hub | `gg77studios/gg77-hub` (privado) | Express + Prisma: contas, nuvem, amigos, presença, tokens de login único |
| Jogo de referência | `gg77studios/project-idle-legends` (privado) | Idle Legends: cliente React/Vite + servidor Express/Prisma |

Endereços:

- **Página de download:** `https://gg77studios.github.io/gg77-builds/` (também na raiz de `https://arena.forjahub.online`).
- **Catálogo remoto:** `https://gg77studios.github.io/gg77-builds/catalog/catalog.json`.
- **Manifesto de um jogo:** `https://github.com/gg77studios/gg77-builds/releases/download/catalog/<id>.json`.
- **Hub:** `https://arena.forjahub.online/hub` (nginx do Idle repassa para o container `gg77-hub:3100`);
  chave pública dos tokens de jogo em `/hub/.well-known/gg77-hub.pem`.

Servidor de produção: `ssh vpszinha`. Pastas `/opt/idle-legends` (compose, `.env`, `nginx.conf`, `site/`,
`launcher/`, `backups/`) e `/opt/gg77-hub` (compose, `.env`). Postgres único no container `forja-db`
(`-U forjaMaster`). Imagens são buildadas localmente e enviadas com
`docker save <img> | gzip | ssh vpszinha 'gunzip | docker load'`.

## Comandos do launcher

```bash
npm install
npm run app:dev          # launcher com recarga (Rust + interface)
npm run dev              # só a interface no navegador (sem Tauri; útil para layout e prints)
npm run build            # tsc + vite (portão do front)
cd src-tauri && cargo test && cargo check   # portões do Rust (packages.rs tem os testes de pacote)
node scripts/make-package.mjs ...           # empacota um jogo (ver docs/NOVO-JOGO.md)
node scripts/publish-catalog.mjs [--dry-run]  # publica CATALOG + imagens no Pages do gg77-builds
node scripts/publish-site.mjs                 # publica site/ (página de download) no Pages
```

Autoteste de pacote, só em modo dev:

- `GG77_AUTOTEST_MANIFEST=<url do manifesto>` instala como jogo `autoteste`, abre a janela por 8 s e loga cada etapa (`[gg77] autoteste: ...`).
- `GG77_AUTOTEST_UPDATE=<manifesto seguinte>` atualiza logo depois, para testar o patch.
- Uma página de sonda no lugar do `index.html` reporta resultados com `GG77.unlock("<resultado>")`; o terminal mostra `[gg77] conquista recebida: autoteste/<resultado>`.

Antes de entregar: `npm run build`, `cargo test` e `cargo check` limpos. Jogo: lint, build e testes do repositório dele.

## Criar um jogo novo (roteiro para o Claude)

Siga nesta ordem. Os trechos de código prontos estão em docs/NOVO-JOGO.md, seção "Começo rápido".

1. **Id do jogo:** minúsculas, números, `-` e `_` (ex. `meu-jogo`). É o mesmo no pacote, no catálogo, no `aud` do token e no `GAMES` do hub.
2. **Cliente** (Vite):
   - `base: './'`, API por endereço absoluto (`VITE_API_URL`);
   - sem Google Fonts, CDN ou analytics: fontes com `@fontsource`;
   - chaves do `localStorage` com prefixo do jogo;
   - header `x-c` com a versão em toda chamada, e o 426 mostra "atualize";
   - atualização só por `GG77.requestUpdate()`;
   - banimento como tela, nunca `location.replace`;
   - nada de OAuth por popup.
3. **SDK:**
   - ponte de conquistas como `client/src/lib/launcher.js` do Idle: assina o estado e manda cada id uma vez;
   - login único como `LauncherSignIn.jsx`: `GG77.getSession()` primeiro, formulário próprio como reserva.
4. **Servidor:**
   - CORS `gg77game://localhost|http://gg77game\.localhost`;
   - `clientVersion.js` (426 abaixo de `MIN_CLIENT_VERSION`);
   - `hubToken.js` com as rotas `/auth/launcher`, `/launcher/link` e `/launcher/register`, mais a coluna `hub_user_id`;
   - `HUB_PUBLIC_KEY` no `.env`.
   Copie os arquivos do Idle, que já têm testes.
5. **Hub:** acrescente o id em `GAMES` no `/opt/gg77-hub/.env` e recrie o container (`docker compose -p gg77-hub -f docker-compose-gg77-hub.yaml up -d`). Sem isso o login único devolve 404 e o jogo cai no formulário.
6. **Catálogo:**
   - entrada em `CATALOG` (`src/lib/catalog.ts`) com `url: ""` (não existe versão web) e `package.manifest`;
   - imagens em `public/games/<id>/`: capa 600x900, banner 1600x900, ícone 512x512, conquistas 192x192, banners de perfil 1500x500;
   - conquistas com `tier`.
7. **Pacote:**
   - copie `tools/launcher-package.sh` e `tools/publish-launcher-package.sh` do Idle e troque o id;
   - o primeiro pacote sai só completo; os seguintes ganham patch automático.
8. **Teste:**
   - autoteste local com o pacote servido por `python3 -m http.server`;
   - sonda para conferir CORS, 426 e login;
   - depois um teste real no launcher em `app:dev`.
9. **Publicar** (com o OK do usuário):
   - deploy do servidor do jogo;
   - `publish-launcher-package.sh`;
   - `node scripts/publish-catalog.mjs`.
   O jogo aparece em todos os launchers 0.5.0+ sem versão nova do launcher.

## Releases

- **Launcher:**
  - suba a versão em `package.json`, `package-lock.json` (linhas 3 e 9), `src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml`;
  - rode `cargo check` para atualizar o `Cargo.lock`;
  - commite e crie a tag `v<versão>`;
  - o workflow `release.yml` gera Windows e Linux. Sem o secret `TAURI_SIGNING_PRIVATE_KEY`, sai sem `latest.json` e o launcher instalado não se atualiza sozinho.
- **Jogo:** deploy do servidor primeiro (dump do banco antes, `.env.bak-<versão>`); depois o pacote. A versão do pacote é a do `client/package.json`, a mesma que vai no `x-c`.
- **Catálogo e página:** `publish-catalog.mjs` e `publish-site.mjs`. O GitHub Pages atualiza em cerca de 1 minuto, com cache de 10 min.
- **Hub:** build da imagem na tag, `docker save | ssh`, troca de `HUB_VERSION` no `/opt/gg77-hub/.env` e `up -d`.
- **Produção** (vpszinha, banco, `.env`, nginx) só com o OK explícito do usuário, a cada vez.

## Regras de segurança (não afrouxar)

- **Janelas de jogo** recebem só `allow-unlock-achievement` e `allow-request-game-update` (`capabilities/game.json`). `get_game_session` fica na capability `game-installed`: só páginas `gg77game` (pacote assinado). O comando confere a origem de novo no Rust.
- **O jogo nunca vê o token da conta do launcher.** O Rust guarda o token (`set_hub_session`) e entrega ao jogo só um token curto com `aud` do próprio jogo.
- **Pacotes:**
  - só instalam com assinatura ed25519 válida (`PUBLIC_KEY_B64` em `packages.rs`);
  - o manifesto v2 assina a lista de arquivos e os patches;
  - cada arquivo é conferido depois do patch;
  - zip-slip bloqueado.
- **Chaves fora do git:**
  - `~/.config/gg77/package-signing.pem` assina os pacotes;
  - `~/.config/gg77/updater.key` assina as atualizações do launcher;
  - os segredos do hub ficam só no `/opt/gg77-hub/.env`.

## Pegadinhas conhecidas

- **Todos os jogos instalados dividem a origem `gg77game://localhost`**, então dividem `localStorage`. Prefixe as chaves. Isolar por jogo é pendência antes do segundo jogo. Um token de teste deixado ali quebrou o login do Idle uma vez.
- **Origens:** no Windows o WebView2 usa `http://gg77game.localhost/<id>/` e `http://tauri.localhost` (janela principal); no Linux, `gg77game://localhost` e `tauri://localhost`. CORS do jogo e do hub precisam das duas.
- **SDK em iframe:** `window.GG77` não é injetado em iframes.
- **`gh secret set` é bloqueado** pelo classificador do modo automático. Peça ao usuário para rodar com `!` no chat e confira com `gh secret list`.
- **Comandos complexos com `git` ou `cd`** podem ser recusados pela trava de worktree: escreva o script num arquivo e rode com `bash arquivo.sh`.
- **Prints:** o launcher roda no navegador (`npm run dev`) com `VITE_HUB_URL` apontando para uma porta morta e `localStorage` `gg77:state`/`gg77:hub` preenchidos. Playwright de `~/Downloads/repos/radar/radar-hospital-fe/node_modules`, com `executablePath` do Chromium em `~/.cache/ms-playwright/chromium-*`.
- **Disco:** builds Docker e `src-tauri/target` enchem o disco. Ao subir versão nova, apague imagens antigas, deixando a atual e a anterior.
- **Fluxo do launcher:** a conta GG77 é a **primeira tela**. Conta salva pula essa tela, inclusive offline.

## Convenções

- Textos de interface em português do Brasil, sem travessão. Comentários do launcher em português; os do Idle em inglês (seguem o repositório).
- Commits em inglês, no formato `tipo(escopo): resumo`, com a linha `Co-Authored-By` que a sessão indicar.
- Ícones: Phosphor (`@phosphor-icons/react`). Botão só com ícone leva `aria-label` e `title`.
