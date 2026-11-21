# GG77 Launcher

Launcher de desktop (Tauri v2 + React) para os jogos de navegador do grupo. Funciona como uma Steam pequena:

- **Biblioteca:** os jogos do catálogo mais os que cada pessoa adicionar por endereço. Cada jogo abre numa janela própria, sem barra de navegador.
- **Tempo de jogo:** conta as sessões, a última vez que jogou e os dias jogados.
- **Conquistas:** as do launcher (pelo uso) e as que os jogos liberam pelo SDK (`window.GG77.unlock`, ver [docs/SDK.md](docs/SDK.md)). Cada conquista dá XP e sobe o nível do perfil, e aparece um aviso no canto da tela com som e notificação do sistema.
- **Perfil:** apelido, avatar (foto ou cor), banner, frase e uma vitrine com 3 conquistas.
- **Personalização:** tema (grafite, meia-noite, claro), cor de destaque e fundo com a arte do jogo.

Tudo fica salvo no próprio computador (`gg77.json` na pasta de dados do app).

## Instalar (para quem só vai jogar)

Baixe o instalador na página de [Releases](../../releases) do repositório.

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
src/                 interface (React)
  lib/catalog.ts     jogos do catálogo e conquistas
  lib/state.tsx      estado, persistência e regras das conquistas do launcher
  lib/platform.ts    ponte com o Tauri (com alternativa para o navegador)
src-tauri/           app nativo (Rust)
  src/lib.rs         abre janelas de jogo, mede sessões, recebe conquistas
  src/sdk.js         SDK injetado nas janelas de jogo
  capabilities/      permissões: janelas de jogo só podem liberar conquistas
```

## Ainda não existe

- Amigos e conquistas compartilhadas: precisa de um servidor pequeno, já que hoje cada launcher guarda tudo só na própria máquina.
- Atualização automática do launcher (plugin updater do Tauri com chave de assinatura).
- Instaladores assinados: sem certificado, o Windows mostra o aviso de "editor desconhecido" na primeira execução.
