# GG77 Launcher

Launcher de desktop (Tauri v2 + React) para os jogos da GG77. Funciona como uma Steam pequena:

- **Conta GG77:** a primeira tela é entrar ou criar a conta. Conquistas, tempo de jogo e perfil ficam na nuvem (GG77 Hub), iguais em qualquer PC.
- **Biblioteca:** os jogos do catálogo (remoto, atualizado sem versão nova do launcher) mais os que cada pessoa adicionar por endereço. Os jogos da GG77 são instalados como pacote assinado e atualizam baixando só o que mudou. Cada jogo abre numa janela própria.
- **Amigos:** pedidos de amizade, quem está online e em qual jogo, perfil do amigo com conquistas.
- **Login único:** logado no launcher, o jogo entra com a conta GG77 (`window.GG77.getSession`).
- **Tempo de jogo:** conta as sessões, a última vez que jogou e os dias jogados.
- **Conquistas:** as do launcher (pelo uso) e as que os jogos liberam pelo SDK (`window.GG77.unlock`, ver [docs/SDK.md](docs/SDK.md)). Cada conquista dá XP e sobe o nível do perfil, e aparece um aviso no canto da tela com som e notificação do sistema.
- **Jogo novo:** o passo a passo para um jogo entrar no launcher (build, SDK, servidor, login único, pacote, catálogo, testes) está em [docs/NOVO-JOGO.md](docs/NOVO-JOGO.md). Para sessões do Claude: [CLAUDE.md](CLAUDE.md).
- **Perfil:** apelido, avatar (foto ou cor), banner, frase e uma vitrine com 3 conquistas.
- **Personalização:** tema (grafite, meia-noite, claro), cor de destaque e fundo com a arte do jogo.

O estado local fica em `gg77.json` na pasta de dados do app e é sincronizado com a conta GG77.

## Instalar (para quem só vai jogar)

Baixe pela página de download: **https://gg77studios.github.io/gg77-builds/** (o botão escolhe o instalador do seu sistema), ou direto nas [Releases](../../releases).

- **Windows:** o arquivo `GG77.Launcher_x.y.z_x64-setup.exe`. Ele instala só para o seu usuário (não pede senha de administrador) e baixa o WebView2 sozinho se o Windows não tiver. Como o instalador não é assinado, o Windows mostra "O Windows protegeu o computador": clique em **Mais informações** e depois em **Executar assim mesmo**.
- **Linux:** o `.AppImage` roda direto (dê permissão de execução), ou instale o `.deb` com `sudo apt install ./arquivo.deb`.

## Rodar

Pré-requisitos no Linux (Ubuntu/Debian):

```bash
sudo apt install -y libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
rustup default stable
npm install
```

```bash
npm run app:dev     # abre o launcher com recarga automática
npm run app:build   # gera os instaladores em src-tauri/target/release/bundle
npm run dev         # só a interface no navegador (sem Rust; os jogos abrem em aba nova)
```

No Linux, `app:build` gera `.deb`, `.rpm` e `.AppImage`. O instalador de Windows (`-setup.exe` e `.msi`) sai do workflow `.github/workflows/release.yml`: publicar uma tag `v*` roda o build em Windows e Linux e anexa os instaladores numa release. Para gerar uma versão nova, suba a versão em `src-tauri/tauri.conf.json` e `package.json` e crie a tag (`git tag v0.2.0 && git push origin v0.2.0`).

## Estrutura

```
src/                   interface (React)
  lib/catalog.ts       jogos do catálogo embutido e conquistas
  lib/state.tsx        estado local, persistência, catálogo remoto, regras das conquistas do launcher
  lib/platform.ts      ponte com o Tauri (com alternativa para o navegador)
  lib/hub.ts           cliente do GG77 Hub (conta, nuvem, amigos)
  lib/account.tsx      sincronização com a nuvem e presença
src-tauri/             app nativo (Rust)
  src/lib.rs           janelas de jogo, sessões, conquistas, sessão do hub e login único
  src/packages.rs      instalação de pacotes (manifesto assinado, patch, protocolo gg77game)
  src/sdk.js           SDK injetado nas janelas de jogo
  capabilities/        janelas de jogo só liberam conquistas e pedem atualização; login único só para jogos instalados
scripts/               empacotar jogo, publicar catálogo e página de download
site/                  página de download (GitHub Pages do gg77-builds)
docs/                  NOVO-JOGO.md (como fazer um jogo para o launcher) e SDK.md
```

## Ainda não existe

- Isolamento por jogo: todos os jogos instalados dividem a origem `gg77game://localhost` (e o `localStorage`).
- Atualização automática nas releases: depende do secret `TAURI_SIGNING_PRIVATE_KEY` no repositório (sem ele a release sai sem `latest.json`).
- Instaladores assinados: sem certificado, o Windows mostra o aviso de "editor desconhecido" na primeira execução.
