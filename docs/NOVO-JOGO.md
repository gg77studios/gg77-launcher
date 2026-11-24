# Como fazer um jogo para o GG77 Launcher

Os jogos da GG77 rodam **só pelo launcher**: não existe versão de navegador. O jogo é um site estático
que o launcher baixa, confere e abre numa janela própria; a API do jogo fica num servidor na
internet. O Idle Legends (`gg77studios/project-idle-legends`) é o exemplo completo: tudo que este guia
pede está pronto lá, com testes. Para sessões do Claude, o roteiro resumido está no
[CLAUDE.md](../CLAUDE.md).

## Como um jogo vive no launcher

```
GG77 Launcher (Tauri, no PC de cada um)
  ├─ catálogo: gg77studios.github.io/gg77-builds/catalog/catalog.json (jogos, capas, conquistas)
  ├─ manifesto do jogo: github.com/gg77studios/gg77-builds/releases/download/catalog/<id>.json
  ├─ baixa o zip completo (primeira vez) ou só o patch (atualização), confere assinatura e sha256
  ├─ instala em <dados do app>/games/<id>/versions/<versão>/
  └─ abre a janela do jogo em gg77game://localhost/<id>/index.html   (Windows: http://gg77game.localhost/<id>/)
        │  window.GG77 (SDK): conquistas, atualização, login pela conta GG77
        ▼
   API do jogo (servidor próprio, na internet)   ◄── confere tokens do GG77 Hub (login único)
```

- **Os arquivos** ficam no repositório público `gg77studios/gg77-builds`, só com releases (CDN do GitHub,
  ~13 MB/s). Cada versão é a release `<id>-v<versão>`; os manifestos atuais ficam na release `catalog`.
- **Atualização** baixa só os arquivos que mudaram: uma mudança de código do Idle custa ~200 KB.
- **Conta GG77:** é a primeira tela do launcher. Conquistas e tempo de jogo vão para a nuvem
  (`arena.forjahub.online/hub`), e o jogo pode entrar com essa conta, sem tela de login própria.

## 1. Regras do cliente

| Regra | Por quê | No Idle |
|---|---|---|
| Build estático com `index.html` na raiz | o launcher abre `index.html` | `client/dist-launcher` |
| **Caminhos relativos** (`base: './'` no Vite) | a página roda em `gg77game://localhost/<id>/`, não na raiz de um domínio | `client/vite.config.js`, modo `launcher` |
| API por **endereço absoluto** (`https://.../api`) | não há proxy na mesma origem | `client/.env.launcher` (`VITE_API_URL`) |
| **Nada de recurso externo** (Google Fonts, CDN de libs, analytics) | abre offline e rápido; fontes vão no pacote | `@fontsource/*` em `client/src/main.jsx` |
| Chaves do `localStorage` **com prefixo do jogo** | todos os jogos dividem a origem `gg77game://localhost` | `idleLegends_token`, `idleLegends_sessionKey` |
| Atualizar pelo launcher, **nunca** `location.reload()` | o reload só recarrega a versão instalada | `GG77.requestUpdate()` em `UpdateBanner.jsx` |
| Sem login por popup/OAuth (Google etc.) | não funciona no WebView; use a conta GG77 | removido na 1.53.0 |
| Versão do cliente em toda chamada (header `x-c`) | o servidor recusa cliente velho com 426 e o jogo pede atualização | `client/src/lib/api.js` |
| Nada de `window.location.replace` para fora | a janela sairia do jogo | tela de banido em `BannedScreen.jsx` |

Tamanho: o que mais pesa é áudio e imagem. Use música em mp3 de 96 kbps ou menos e imagens
comprimidas. Nomes de arquivo com hash (padrão do Vite) ajudam: asset que não mudou não é baixado de novo.

## 2. Regras do servidor

- **CORS** liberando as origens do launcher, com regex ancorada: `gg77game://localhost|http://gg77game\.localhost`.
- **Versão mínima:** middleware que lê `x-c` e responde `426 {update: true}` abaixo de `MIN_CLIENT_VERSION`
  (vazio = aceita todos). Modelo: `server/middleware/clientVersion.js` do Idle, com testes.
- **Login único:** rotas `/auth/launcher`, `/auth/launcher/link` e `/auth/launcher/register`, mais a coluna
  `hub_user_id` (seção 4).
- Exponha os headers que o cliente lê (`exposedHeaders` no `cors`).
- Não banir por "origem diferente do host": no launcher a origem nunca bate com o host da API.

## 3. SDK (`window.GG77`)

Injetado pelo launcher antes do jogo carregar. Em `npm run dev` no navegador ele não existe: use
sempre `?.`, e o jogo segue com login e reload normais para desenvolver.

```js
window.GG77?.inLauncher;                         // true dentro do launcher
window.GG77?.unlock("primeira-vitoria", {        // conquista (título/descrição opcionais se estiver no catálogo)
  title: "Primeiro sangue",
  description: "Vença a primeira luta.",
});
window.GG77?.requestUpdate();                    // fecha o jogo, instala a versão nova e reabre
await window.GG77?.getSession();                 // login único: { token, nickname } (5 min)
window.addEventListener("gg77:ready", () => {}); // SDK pronto
```

Detalhes das conquistas em [SDK.md](SDK.md).

## 4. Login único (conta GG77)

Quem está logado no launcher entra no jogo sem tela de login. Só jogos **instalados** pelo launcher
(pacote assinado) recebem token, e o token vale só para o próprio jogo (`aud`).

1. **Cliente:** sem sessão salva, chama `window.GG77.getSession()` e manda o token ao servidor. Se falhar
   (launcher antigo, `npm run dev`), mostra o formulário de login do jogo.
2. **Servidor:** `POST /api/auth/launcher { hubToken }` confere o token com a chave pública do hub
   (`https://arena.forjahub.online/hub/.well-known/gg77-hub.pem`, no env `HUB_PUBLIC_KEY`):
   algoritmo `EdDSA`, `iss = gg77-hub`, `aud = <id do jogo>` e validade. `sub` é o id da conta GG77.
   - Conta do jogo já ligada (`users.hub_user_id = sub`): devolve a sessão normal do jogo.
   - Não ligada: `{ needsLink: true }`. O jogo mostra "Já jogo" (apelido e senha do jogo uma vez,
     `/launcher/link`) ou "Sou novo" (só apelido, `/launcher/register`, conta sem senha).
3. **Hub:** acrescente o id do jogo no `GAMES` de `/opt/gg77-hub/.env` (lista separada por vírgula) e
   recrie o container. Sem isso o launcher recebe 404 e o jogo cai no formulário.

## 5. Começo rápido (código para copiar)

Os arquivos completos estão no Idle. Abaixo, o mínimo de cada peça.

**`vite.config.js` + `.env.launcher`**

```js
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "launcher" ? "./" : "/",
  build: mode === "launcher" ? { outDir: "dist-launcher" } : undefined,
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(version) }, // version do package.json
}));
// package.json: "build:launcher": "vite build --mode launcher"
// .env.launcher: VITE_API_URL=https://meu-jogo.exemplo/api
```

**Chamadas à API** (`x-c`, 426 e banimento num lugar só)

```js
const API = import.meta.env.VITE_API_URL ?? "/api";
const VERSION = import.meta.env.VITE_APP_VERSION;

export async function api(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-c", VERSION);
  const token = localStorage.getItem("meuJogo_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(API + path, { ...init, headers });
  if (res.status === 426) onUpdateRequired();    // mostra "atualize" -> GG77.requestUpdate()
  if (res.status === 403) await maybeBanned(res); // tela de banido, sem sair da página
  return res;
}
```

**Conquistas** (cada id uma vez; o launcher ignora repetidas)

```js
const sent = new Set();
export function unlock(id, info) {
  if (!window.GG77 || sent.has(id)) return;
  sent.add(id);
  window.GG77.unlock(id, info).catch(() => sent.delete(id)); // tenta de novo na próxima mudança
}
// onde o jogo detecta o momento: if (player.level >= 10) unlock("nivel-10");
```

**Login único no cliente**

```js
async function enterWithLauncher() {
  if (!window.GG77?.getSession) return false;         // fora do launcher: formulário normal
  const { token } = await window.GG77.getSession();   // falha se o launcher estiver sem conta
  const res = await api("/auth/launcher", { method: "POST", body: JSON.stringify({ hubToken: token }) });
  const data = await res.json();
  if (data.token) { saveSession(data); return true; } // conta já ligada
  if (data.needsLink) showLinkScreen();               // "Já jogo" / "Sou novo"
  return false;
}
```

**Servidor** (Express; copie do Idle `server/middleware/clientVersion.js` e `server/utils/hubToken.js`)

```js
app.use(cors({ origin: /^(?:gg77game:\/\/localhost|http:\/\/gg77game\.localhost)$/, exposedHeaders: ["x-v"] }));
app.use("/api/auth", requireClientVersion, authRouter);   // 426 abaixo de MIN_CLIENT_VERSION
app.use("/api", requireClientVersion, gameRouter);

// login único: verifyHubToken confere EdDSA, iss gg77-hub, aud "meu-jogo" e validade
router.post("/launcher", async (req, res) => {
  const hub = await verifyHubToken(req.body?.hubToken);
  if (!hub) return res.status(401).json({ error: "Sessão do launcher inválida" });
  const user = await db.user.findUnique({ where: { hubUserId: hub.hubUserId } });
  if (!user) return res.json({ needsLink: true, suggestedNickname: hub.nick });
  return res.json(await newSession(user));
});
```

## 6. Empacotar e publicar

Copie do Idle e troque o id:

- `tools/make-launcher-package.mjs`, cópia do `scripts/make-package.mjs` deste repositório: gera o zip
  completo, o patch desde a versão anterior e o manifesto assinado.
- `tools/launcher-package.sh`: build e empacotamento. Pega o manifesto anterior da release `catalog`
  para calcular o patch.
- `tools/publish-launcher-package.sh`: cria a release `<id>-v<versão>` no `gg77-builds` e sobe o
  manifesto para a release `catalog`.

```bash
tools/launcher-package.sh             # launcher/<id>-<v>.zip, <id>-<v>-from-<anterior>.zip, <id>.json
tools/publish-launcher-package.sh     # publica (precisa do gh logado na org gg77studios)
```

- **Chave de assinatura:** `~/.config/gg77/package-signing.pem` (ed25519, nunca no git). A pública está
  embutida no launcher (`PUBLIC_KEY_B64` em `src-tauri/src/packages.rs`). Pacote sem assinatura válida
  não instala.
- **Versão:** `x.y.z`, sempre maior que a anterior. É a mesma que o cliente manda no `x-c`.
- **`minLauncher`:** versão mínima do launcher que o pacote exige. Suba quando o jogo usar algo novo do
  SDK; `getSession` pede 0.5.0.
- **Ordem do deploy:** servidor do jogo primeiro, pacote depois. O cliente velho vê "saiu a versão
  nova" e se atualiza pelo launcher.

O manifesto v2 tem os campos v1 (`url`, `sha256`, `signature` do zip completo) mais `files` (cada
arquivo com sha256), `patches` e `signatureV2`, que cobre tudo. O formato está descrito no topo de
`scripts/make-package.mjs`.

## 7. Cadastrar no catálogo

Entrada em `CATALOG` (`src/lib/catalog.ts`), imagens em `public/games/<id>/`. Publicação:

```bash
node scripts/publish-catalog.mjs --dry-run   # gera em ./catalog-out para conferir
node scripts/publish-catalog.mjs             # commit + push no gg77-builds (Pages atualiza em ~1 min)
```

Launchers 0.5.0+ leem o catálogo remoto ao abrir: **o jogo aparece para todo mundo sem versão nova do
launcher**. Lançar uma versão do launcher de vez em quando mantém em dia o catálogo embutido, usado na
primeira abertura e offline.

```ts
{
  id: "meu-jogo",                       // igual ao id do pacote (minúsculas, números, - e _)
  title: "Meu Jogo",
  url: "",                              // jogos da GG77 não têm versão web
  package: { manifest: "https://github.com/gg77studios/gg77-builds/releases/download/catalog/meu-jogo.json" },
  cover: "/games/meu-jogo/cover.jpg",   // 600x900 (2:3)
  banner: "/games/meu-jogo/banner.jpg", // 1600x900 (16:9), vira o fundo do launcher
  icon: "/games/meu-jogo/icon.png",     // 512x512 PNG com transparência
  tint: "#1f2329",                      // cor de fundo enquanto a imagem carrega
  tagline: "Uma frase sobre o jogo.",
  pixelArt: false,                      // true desenha os ícones sem suavizar
  achievements: [                       // tier: "comum" | "rara" | "épica"; hidden esconde até liberar
    { id: "primeira-vitoria", title: "...", description: "...", tier: "comum", icon: "/games/meu-jogo/achievements/primeira-vitoria.png" },
  ],
  iconRules: [{ match: ".", icon: "/games/meu-jogo/achievements/extra-default.png" }], // conquistas fora da lista
  // itens da loja do launcher (raridade define o preço: comum 30, rara 80, épica 180, lendária 350 fichas)
  banners: [{ id: "x", title: "...", image: "/games/meu-jogo/banners/x.jpg", rarity: "rara" }],
  avatars: [{ id: "heroi", name: "Herói", image: "/games/meu-jogo/avatars/heroi.png", rarity: "comum" }],
}
```

Ícones de conquista: 192x192 PNG. Banners de perfil: 1500x500 JPG (3:1). Avatares: 256x256, retrato de
busto com o rosto no centro (o launcher recorta em círculo e põe moldura por cima; `pixelArt: true` vale
para eles também).

Banners e avatares não são liberados por conquista: entram na **Loja** do launcher e são comprados com
fichas, que o jogador ganha com conquistas (de qualquer jogo), horas jogadas e níveis. Conquista boa
continua importante, porque vira ficha e XP. O campo antigo `unlock` do banner ainda é aceito: serve só
para sugerir a raridade (a da conquista) e para dar o banner de graça a quem já tinha liberado antes da 0.6.
`scripts/make-avatars.py` mostra como os avatares dos jogos atuais foram recortados da arte de cada um.

## 8. Testar antes de publicar

No repositório do launcher, com o pacote servido localmente:

```bash
python3 -m http.server 8765 --directory <pasta com o manifesto e o zip> &
GG77_AUTOTEST_MANIFEST=http://127.0.0.1:8765/<id>.json npm run app:dev
# atualização por patch: aponte também para o manifesto da versão seguinte
GG77_AUTOTEST_UPDATE=http://127.0.0.1:8765/v2/<id>.json
```

O autoteste instala o pacote como jogo `autoteste`, abre a janela por 8 s e escreve no terminal cada
etapa (`[gg77] autoteste: instalação Ok(...)`) e cada conquista recebida pelo SDK. Para conferir
chamadas à API (CORS, 426, login), ponha uma página de sonda no lugar do `index.html` que reporta
com `GG77.unlock("<resultado>")`. Depois teste de verdade: `npm run app:dev`, entre com a conta GG77 e
instale o jogo pela biblioteca.

## Checklist

- [ ] Build com `base: './'`, API absoluta, sem recurso externo
- [ ] `localStorage` com prefixo do jogo
- [ ] Atualização via `GG77.requestUpdate()`, header `x-c` e tratamento de 426
- [ ] Login único: `GG77.getSession()`, rotas `/auth/launcher*` no servidor, id do jogo no `GAMES` do hub
- [ ] Servidor com CORS para `gg77game://localhost` e `http://gg77game.localhost`
- [ ] Conquistas enviadas pelo SDK e cadastradas no catálogo com ícones
- [ ] Capa, banner e ícone nos tamanhos acima
- [ ] Banners de perfil e avatares para a loja (opcional, mas é o que os amigos colecionam)
- [ ] Pacote testado com o autoteste e no launcher de verdade
- [ ] Publicado no `gg77-builds` e jogo no catálogo

## Limites atuais

- Todos os jogos dividem a origem `gg77game://localhost`, então dividem `localStorage` e IndexedDB.
  Por isso o prefixo nas chaves. O isolamento por jogo está previsto antes do segundo jogo.
- As conquistas são informadas pelo cliente. Para um grupo de amigos é aceitável; validação pelo
  servidor do jogo fica para depois.
- O launcher só se atualiza sozinho quando a release tiver `latest.json`, o que exige o secret
  `TAURI_SIGNING_PRIVATE_KEY` no repositório. Mesmo assim, no Linux só o AppImage se atualiza; `.deb` e
  `.rpm` mostram o aviso e o link da versão nova.
