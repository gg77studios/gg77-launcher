# Como colocar um jogo novo no GG77 Launcher

Guia para os próximos jogos já nascerem para o launcher. O Idle Legends é o exemplo completo: o
que este guia pede está pronto lá (`client/` e `tools/` no repositório `gg77studios/project-idle-legends`).

## Como um jogo vive no launcher

```
GG77 Launcher (Tauri, no PC de cada um)
  ├─ lê o manifesto do jogo   github.com/gg77studios/gg77-builds/releases/download/catalog/<id>.json
  ├─ baixa o zip completo (primeira vez) ou só o patch (atualização), confere assinatura e sha256
  ├─ instala em <dados do app>/games/<id>/versions/<versão>/
  └─ abre a janela do jogo em gg77game://localhost/<id>/index.html   (Windows: http://gg77game.localhost/<id>/)
        │  window.GG77 (SDK) injetado: conquistas, atualização
        ▼
   API do jogo (servidor próprio do jogo, na internet)
```

- O jogo é um **site estático empacotado** (HTML/JS/CSS + assets). Não existe servidor de páginas: o
  launcher serve os arquivos do disco.
- A **API do jogo** (contas, saves, ranking) continua num servidor do próprio jogo, na internet. O
  launcher não tem nada a ver com ela, só a libera via CORS.
- Os arquivos dos jogos ficam no repositório público **`gg77studios/gg77-builds`**, só com releases
  (CDN do GitHub, ~13 MB/s). Cada versão é a release `<id>-v<versão>`; os manifestos atuais ficam na
  release `catalog`.

## 1. Requisitos do cliente

| Regra | Por quê | No Idle |
|---|---|---|
| Build estático com `index.html` na raiz | o launcher abre `index.html` | `client/dist-launcher` |
| **Caminhos relativos** (`base: './'` no Vite) | a página roda em `gg77game://localhost/<id>/`, não na raiz de um domínio | `client/vite.config.js`, modo `launcher` |
| API por **endereço absoluto** (`https://.../api`) | não há proxy na mesma origem | `client/.env.launcher` (`VITE_API_URL`) |
| **Nada de recurso externo** (Google Fonts, CDN de libs, analytics) | o jogo tem de abrir offline e rápido; fontes vão no pacote | `@fontsource/*` em `client/src/main.jsx` |
| Chaves do `localStorage` **com prefixo do jogo** | todos os jogos dividem a origem `gg77game://localhost` (ver "Limites") | `idleLegends_token`, `idleLegends_sessionKey` |
| Atualizar pelo launcher, **nunca** `location.reload()` | o reload só recarrega a versão instalada | `GG77.requestUpdate()` em `UpdateBanner.jsx` |
| Sem login por popup/OAuth do Google | não funciona no WebView | Google desligado com `IS_LAUNCHER` |
| Mandar a versão do cliente em toda chamada (header `x-c`) | o servidor recusa cliente velho com 426 e o jogo pede atualização | `client/src/lib/api.js` |
| Nada de `window.location.replace` para fora | a janela do jogo sairia do jogo | tela de banido em `BannedScreen.jsx` |

Tamanho: o que mais pesa é áudio e imagem. Música em mp3 96 kbps (ou menos) e imagens comprimidas.
Atualizações baixam só os arquivos que mudaram, então nomes de arquivo com hash (padrão do Vite)
ajudam: asset que não mudou não é baixado de novo.

## 2. Requisitos do servidor do jogo

- **CORS** liberando as duas origens do launcher (regex ancorada):
  `gg77game://localhost|http://gg77game\.localhost`. No Idle: `ALLOWED_ORIGIN` em `server/index.js`.
- **Versão mínima** (recomendado): middleware que lê `x-c` e responde `426 {update: true}` abaixo de
  `MIN_CLIENT_VERSION`. Modelo: `server/middleware/clientVersion.js` do Idle (com testes).
- Expor os headers que o cliente lê (`exposedHeaders` no `cors`).
- Não banir por "origem diferente do host": no launcher a origem nunca bate com o host da API.

## 3. SDK (`window.GG77`)

Injetado pelo launcher antes do jogo carregar. Fora do launcher não existe: use sempre `?.`.

```js
window.GG77?.inLauncher;                        // true dentro do launcher
window.GG77?.unlock("primeira-vitoria", {       // conquista (título/descrição opcionais se estiver no catálogo)
  title: "Primeiro sangue",
  description: "Vença a primeira luta.",
});
window.GG77?.requestUpdate();                   // fecha o jogo, instala a versão nova e reabre
await window.GG77?.getSession();                // login único: { token, nickname } (ver abaixo)
window.addEventListener("gg77:ready", () => {}); // SDK pronto
```

Detalhes das conquistas em [SDK.md](SDK.md). Integração de referência: `client/src/lib/launcher.js` do Idle
(assina o estado do jogo e manda cada conquista uma vez).

### Login único (conta GG77)

Quem está logado no launcher entra no jogo sem tela de login. Funciona só para jogos **instalados**
pelo launcher (pacote assinado); página da web aberta como jogo não recebe token.

1. **Cliente:** ao abrir sem sessão salva, chama `window.GG77.getSession()`. Recebe `{ token, nickname }`
   (token de 5 min). Falhou (launcher sem conta, launcher antigo)? Mostra o login normal.
2. **Servidor do jogo:** `POST /api/auth/launcher { hubToken }` confere o token com a chave pública do hub
   (`https://gg77.forjahub.online/.well-known/gg77-hub.pem`, guardada no env `HUB_PUBLIC_KEY`):
   algoritmo `EdDSA`, `iss = gg77-hub`, `aud = <id do jogo>`, validade. `sub` = id da conta GG77.
   - Conta do jogo já ligada (`users.hub_user_id = sub`): devolve a sessão normal do jogo.
   - Não ligada: responde `{ needsLink: true }` e o jogo mostra "Já jogo" (apelido e senha do jogo uma
     vez, `/launcher/link`) ou "Sou novo" (só apelido, `/launcher/register`, conta sem senha).
3. **Hub:** o id do jogo precisa estar no env `GAMES` do hub (lista separada por vírgula), senão o
   launcher recebe 404 e o jogo cai no login normal.

Modelo pronto no Idle: `server/utils/hubToken.js` (verificação, com testes), as rotas `/launcher*` em
`server/routes/auth.js` e `client/src/components/LauncherSignIn.jsx`.

## 4. Empacotar e publicar

Ferramentas (copie do Idle e troque o id):

- `scripts/make-package.mjs` (deste repositório; cópia em `tools/make-launcher-package.mjs` no Idle):
  gera o zip completo, o patch desde a versão anterior e o manifesto assinado.
- `tools/launcher-package.sh` do Idle: build + empacotamento, pegando o manifesto anterior da release
  `catalog` para calcular o patch.
- `tools/publish-launcher-package.sh` do Idle: cria a release `<id>-v<versão>` no `gg77-builds` e sobe o
  manifesto para a release `catalog`.

```bash
npm run build:launcher                # build com caminhos relativos e API absoluta
tools/launcher-package.sh             # launcher/<id>-<v>.zip, <id>-<v>-from-<anterior>.zip, <id>.json
tools/publish-launcher-package.sh     # publica (precisa do gh logado na org gg77studios)
```

- **Chave de assinatura:** `~/.config/gg77/package-signing.pem` (ed25519, nunca no git). A pública está
  embutida no launcher (`PUBLIC_KEY_B64` em `src-tauri/src/packages.rs`). Um pacote sem assinatura válida
  não instala.
- **Versão:** `x.y.z`, sempre maior que a anterior. A versão do pacote é a mesma que o cliente manda no
  `x-c`.
- **`minLauncher`:** a versão mínima do launcher que o pacote exige (padrão `0.3.0`). Suba quando o jogo
  usar algo novo do SDK.

O manifesto v2 tem os campos v1 (`url`, `sha256`, `signature` do zip completo, lidos pelo launcher 0.3.0)
mais `files` (cada arquivo com sha256), `patches` e `signatureV2`, que cobre tudo. O formato está
descrito no topo de `scripts/make-package.mjs`.

## 5. Cadastrar no catálogo do launcher

O catálogo é escrito em `CATALOG` (`src/lib/catalog.ts`), com as imagens em `public/games/<id>/`, e
publicado no GitHub Pages do `gg77-builds`:

```bash
node scripts/publish-catalog.mjs --dry-run   # gera em ./catalog-out para conferir
node scripts/publish-catalog.mjs             # commit + push no gg77-builds (Pages atualiza em ~1 min)
```

O launcher (0.5.0+) lê `https://gg77studios.github.io/gg77-builds/catalog/catalog.json` ao abrir, guarda
a última cópia e usa o catálogo embutido se estiver offline. **Jogo novo aparece para todo mundo sem
nova versão do launcher.** Ainda vale lançar uma versão do launcher de vez em quando, para o catálogo
embutido (primeira abertura, offline) ficar em dia.

```ts
{
  id: "meu-jogo",                       // igual ao id do pacote (letras minúsculas, números, - e _)
  title: "Meu Jogo",
  url: "",                              // versão web (opcional, usada se o pacote falhar)
  package: { manifest: "https://github.com/gg77studios/gg77-builds/releases/download/catalog/meu-jogo.json" },
  cover: "/games/meu-jogo/cover.jpg",   // 600x900 (2:3)
  banner: "/games/meu-jogo/banner.jpg", // 1600x900 (16:9)
  icon: "/games/meu-jogo/icon.png",     // 512x512 PNG com transparência
  tint: "#1f2329",                      // cor de fundo enquanto a imagem carrega
  tagline: "Uma frase sobre o jogo.",
  pixelArt: false,                      // true desenha os ícones sem suavizar
  achievements: [                       // tier: "comum" | "rara" | "épica"; hidden esconde até liberar
    { id: "primeira-vitoria", title: "...", description: "...", tier: "comum", icon: "/games/meu-jogo/achievements/primeira-vitoria.png" },
  ],
  iconRules: [{ match: ".", icon: "/games/meu-jogo/achievements/extra-default.png" }], // conquistas fora da lista
  banners: [{ id: "x", title: "...", image: "/games/meu-jogo/banners/x.jpg", unlock: "primeira-vitoria" }],
}
```

Ícones de conquista: 192x192 PNG. Banners de perfil: 1500x500 JPG (3:1), cada um liberado por uma conquista.

## 6. Testar antes de publicar

No repositório do launcher, com o pacote servido localmente:

```bash
python3 -m http.server 8765 --directory <pasta com o manifesto e o zip> &
GG77_AUTOTEST_MANIFEST=http://127.0.0.1:8765/<id>.json npm run app:dev
# atualização por patch: aponte também para o manifesto da versão seguinte
GG77_AUTOTEST_UPDATE=http://127.0.0.1:8765/v2/<id>.json
```

O autoteste instala o pacote como jogo `autoteste`, abre a janela por 8 s e escreve no terminal cada
etapa (`[gg77] autoteste: instalação Ok(...)`) e cada conquista recebida pelo SDK. Para conferir
chamadas à API, uma página de sonda no lugar do `index.html` pode reportar resultados com
`GG77.unlock("<resultado>")`.

## Checklist

- [ ] Build com `base: './'`, API absoluta, sem recurso externo
- [ ] `localStorage` com prefixo do jogo
- [ ] Atualização via `GG77.requestUpdate()`, header `x-c` + tratamento de 426
- [ ] Login único: `GG77.getSession()` + rota `/auth/launcher` no servidor + id do jogo no `GAMES` do hub
- [ ] Servidor com CORS para `gg77game://localhost` e `http://gg77game.localhost`
- [ ] Conquistas enviadas pelo SDK e cadastradas no catálogo com ícones
- [ ] Capa, banner e ícone nos tamanhos acima
- [ ] Pacote testado com o autoteste
- [ ] Publicado no `gg77-builds` e jogo no catálogo

## Limites atuais

- Todos os jogos dividem a origem `gg77game://localhost`, então dividem `localStorage` e IndexedDB.
  Por isso o prefixo nas chaves. O isolamento por jogo está previsto antes do segundo jogo.
- As conquistas são informadas pelo cliente. Para um grupo de amigos é aceitável; validação pelo
  servidor do jogo fica para depois.
- O launcher se atualiza sozinho (0.5.0+) no Windows e no AppImage do Linux. Quem instalou o `.deb`
  ou o `.rpm` vê o aviso e baixa a versão nova na página de releases.
