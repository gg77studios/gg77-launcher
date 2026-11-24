import { AVATAR_PRESETS, LAUNCHER_AVATARS, LAUNCHER_BANNERS, LAUNCHER_ID, TIER_XP } from "./catalog";
import type { AchievementDef, Game, GameStats, ItemKind, Rarity, ShopItem, Tier, Unlock } from "./types";

/** Nome da moeda da loja (fácil de trocar). */
export const COIN = { one: "ficha", many: "fichas" };

export const RARITY_PRICE: Record<Rarity, number> = { comum: 30, rara: 80, épica: 180, lendária: 350 };

export const RARITIES: Rarity[] = ["comum", "rara", "épica", "lendária"];

/** Fichas por fonte: conquista (igual ao XP), hora cheia jogada e nível alcançado. */
export const COINS_PER_HOUR = 15;
export const COINS_PER_LEVEL = 30;

export const fmtCoins = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? COIN.one : COIN.many}`;

/** Parte do id depois de "<kind>:" (ex. "frame:ouro" → "ouro"). */
export const itemValue = (id: string | undefined) => (id ? id.slice(id.indexOf(":") + 1) : "");

export const itemKind = (id: string) => id.slice(0, id.indexOf(":")) as ItemKind;

type Def = { id: string; name: string; rarity: Rarity; free?: boolean; minLevel?: number; description?: string; collection?: string };

/** Nomes das coleções temáticas (chips da loja). */
export const COLLECTIONS: Record<string, string> = { sandbox: "Sandbox" };

const make = (kind: ItemKind, defs: Def[]): ShopItem[] =>
  defs.map((d) => ({
    id: `${kind}:${d.id}`,
    kind,
    name: d.name,
    rarity: d.rarity,
    price: d.free ? 0 : RARITY_PRICE[d.rarity],
    minLevel: d.minLevel,
    description: d.description,
    collection: d.collection,
  }));

/** Molduras. O desenho de cada uma está em components/FrameArt.tsx (mesmo id). */
export const FRAME_ITEMS = make("frame", [
  { id: "vidro", name: "Vidro", rarity: "comum", free: true, description: "Aro de vidro com reflexo." },
  { id: "neon", name: "Neon", rarity: "comum", description: "Aro na cor de destaque, com brilho." },
  { id: "folhagem", name: "Folhagem", rarity: "comum", description: "Folhas em volta do avatar." },
  { id: "ouro", name: "Ouro", rarity: "rara", description: "Ouro lapidado com quatro gemas." },
  { id: "pixel", name: "Pixel", rarity: "rara", description: "Borda quadrada em pixel art." },
  { id: "cristal", name: "Cristal de gelo", rarity: "rara", description: "Lascas de gelo que cintilam." },
  { id: "circuito", name: "Circuito", rarity: "rara", description: "Trilhas de energia correndo pelo aro." },
  { id: "espinhos", name: "Espinhos", rarity: "rara", description: "Aro escuro cheio de pontas." },
  { id: "pixel-coracao", name: "Pixel coração", rarity: "rara", description: "Pixel art com corações nos cantos." },
  { id: "gladiador", name: "Gladiador", rarity: "épica", description: "Bronze, louros e escudo da arena." },
  { id: "chamas", name: "Chamas", rarity: "épica", description: "Labaredas vivas em volta do avatar." },
  { id: "runas", name: "Runas", rarity: "épica", description: "Runas que giram e brilham." },
  { id: "coroa", name: "Coroa", rarity: "épica", description: "Aro dourado com coroa cravejada." },
  { id: "holografica", name: "Holográfica", rarity: "lendária", minLevel: 6, description: "Aro iridescente que gira sem parar." },
  { id: "bloco-grama", name: "Bloco de grama", rarity: "comum", collection: "sandbox", description: "Terra e grama em blocos de pixel." },
  { id: "minerio", name: "Veio de minério", rarity: "rara", collection: "sandbox", description: "Pedra com minérios que brilham." },
  { id: "portal", name: "Portal sombrio", rarity: "épica", collection: "sandbox", description: "Obsidiana com um redemoinho roxo." },
  { id: "cosmica", name: "Cósmica", rarity: "lendária", minLevel: 8, description: "Uma galáxia em volta do avatar." },
]);

export const AVATAR_FX_ITEMS = make("avatarFx", [
  { id: "aura", name: "Aura", rarity: "rara", description: "Brilho pulsante na cor de destaque." },
  { id: "faiscas", name: "Faíscas", rarity: "rara", description: "Faíscas que sobem em volta do avatar." },
  { id: "orbita", name: "Órbita", rarity: "épica", description: "Três esferas em órbita." },
  { id: "fumaca", name: "Fumaça", rarity: "épica", description: "Névoa arroxeada subindo por trás." },
  { id: "glitch", name: "Glitch", rarity: "lendária", minLevel: 6, description: "O avatar falha e se recompõe." },
]);

export const BANNER_FX_ITEMS = make("bannerFx", [
  { id: "neve", name: "Neve", rarity: "rara", description: "Flocos caindo devagar sobre o banner." },
  { id: "vagalumes", name: "Vaga-lumes", rarity: "rara", description: "Luzinhas flutuando." },
  { id: "chuva", name: "Chuva", rarity: "rara", description: "Chuva fina na diagonal." },
  { id: "brasas", name: "Brasas", rarity: "épica", description: "Brasas subindo de uma fogueira." },
  { id: "estrelas", name: "Estrelas cadentes", rarity: "épica", description: "Céu estrelado com riscos de luz." },
  { id: "aurora", name: "Aurora", rarity: "lendária", minLevel: 6, description: "Faixas de aurora boreal ondulando." },
  { id: "blocos", name: "Blocos quebrando", rarity: "rara", collection: "sandbox", description: "Pedacinhos de bloco caindo pelo banner." },
]);

export const NAME_STYLE_ITEMS = make("nameStyle", [
  { id: "brilho", name: "Brilho", rarity: "comum", description: "Um reflexo passa pelo apelido." },
  { id: "degrade", name: "Degradê", rarity: "rara", description: "Apelido em degradê da cor de destaque." },
  { id: "neon", name: "Neon", rarity: "rara", description: "Letreiro de neon que tremula." },
  { id: "pixel", name: "Pixel", rarity: "rara", description: "Apelido em fonte pixelada." },
  { id: "ouro", name: "Ouro", rarity: "épica", description: "Letras de ouro polido." },
  { id: "arco-iris", name: "Arco-íris", rarity: "lendária", minLevel: 5, description: "Cores que correm pelo apelido." },
  { id: "voxel", name: "Bloco", rarity: "rara", collection: "sandbox", description: "Letras de bloco em 3D, verde de grama." },
]);

/** Temas: os três primeiros são grátis. As cores de cada um estão em styles.css ([data-theme]). */
export const THEME_ITEMS = make("theme", [
  { id: "grafite", name: "Grafite", rarity: "comum", free: true },
  { id: "meia-noite", name: "Meia-noite", rarity: "comum", free: true },
  { id: "claro", name: "Claro", rarity: "comum", free: true },
  { id: "floresta", name: "Floresta", rarity: "rara", description: "Verdes de mata fechada." },
  { id: "oceano", name: "Oceano", rarity: "rara", description: "Azul-petróleo de mar fundo." },
  { id: "pergaminho", name: "Pergaminho", rarity: "rara", description: "Claro e quente, como papel antigo." },
  { id: "brasa", name: "Brasa", rarity: "épica", description: "Vermelho e carvão." },
  { id: "synthwave", name: "Synthwave", rarity: "épica", description: "Roxo e rosa de fliperama." },
  { id: "blocos", name: "Mundo de blocos", rarity: "rara", collection: "sandbox", description: "Verde de grama e marrom de terra." },
]);

/** Prévia das cores de cada tema (cartões da loja e do perfil). */
export const THEME_PREVIEW: Record<string, { bg: string; surface: string; light?: boolean }> = {
  grafite: { bg: "#101216", surface: "#1e222a" },
  "meia-noite": { bg: "#07080d", surface: "#151826" },
  claro: { bg: "#f3f4f6", surface: "#ffffff", light: true },
  floresta: { bg: "#0b140f", surface: "#16261c" },
  oceano: { bg: "#061317", surface: "#0f252c" },
  pergaminho: { bg: "#efe4cf", surface: "#fbf4e6", light: true },
  brasa: { bg: "#140a08", surface: "#2a1410" },
  synthwave: { bg: "#120a1f", surface: "#241238" },
  blocos: { bg: "#13180d", surface: "#2b3a1c" },
};

export const LIGHT_THEMES = new Set(Object.entries(THEME_PREVIEW).filter(([, t]) => t.light).map(([id]) => id));

/** Fundos animados do launcher (o desenho está em styles.css, .wall-img--<id>). */
export const WALLPAPER_ITEMS = make("wallpaper", [
  { id: "degrade", name: "Degradê", rarity: "comum", free: true, description: "Degradê suave da cor de destaque." },
  { id: "aurora", name: "Aurora", rarity: "rara", description: "Manchas de luz que se movem devagar." },
  { id: "estrelas", name: "Céu estrelado", rarity: "épica", description: "Estrelas piscando no escuro." },
  { id: "grade-neon", name: "Grade neon", rarity: "épica", description: "Horizonte synthwave com sol e grade." },
]);

export const STARTER_AVATAR = "avatar:ini-0";

/** Monta a loja inteira: itens fixos + avatares e banners de cada jogo do catálogo. */
export function buildShop(games: Game[], defsFor: (gameId: string) => AchievementDef[]): ShopItem[] {
  const initials: ShopItem[] = AVATAR_PRESETS.map((_, i) => ({
    id: `avatar:ini-${i}`,
    kind: "avatar",
    name: `Iniciais ${i + 1}`,
    rarity: "comum",
    price: 0,
  }));
  const launcherAvatars: ShopItem[] = LAUNCHER_AVATARS.map((a, i) => ({
    id: `avatar:${LAUNCHER_ID}:${a.id}`,
    kind: "avatar",
    name: a.name,
    rarity: a.rarity ?? "comum",
    // os seis primeiros vêm com a conta
    price: i < 6 ? 0 : RARITY_PRICE[a.rarity ?? "comum"],
    image: a.image,
    gameId: LAUNCHER_ID,
    collection: a.collection,
  }));
  const gameAvatars: ShopItem[] = games.flatMap((g) =>
    (g.avatars ?? []).map((a) => ({
      id: `avatar:${g.id}:${a.id}`,
      kind: "avatar" as const,
      name: a.name,
      rarity: a.rarity ?? "comum",
      price: RARITY_PRICE[a.rarity ?? "comum"],
      image: a.image,
      pixel: g.pixelArt,
      gameId: g.id,
    })),
  );
  const banners: ShopItem[] = [
    { gameId: LAUNCHER_ID, list: LAUNCHER_BANNERS },
    ...games.map((g) => ({ gameId: g.id, list: g.banners ?? [] })),
  ].flatMap(({ gameId, list }) =>
    // banner sem imagem (o "Padrão" do launcher) é o degradê, que já é a opção "sem banner"
    list.filter((b) => b.image).map((b) => {
      const tier = b.unlock ? defsFor(gameId).find((d) => d.id === b.unlock)?.tier : undefined;
      const rarity: Rarity = b.rarity ?? tier ?? "rara";
      return {
        id: `banner:${gameId}:${b.id}`,
        kind: "banner" as const,
        name: b.title,
        rarity,
        price: RARITY_PRICE[rarity],
        image: b.image,
        gameId,
        collection: b.collection,
      };
    }),
  );
  return [
    ...initials,
    ...launcherAvatars,
    ...gameAvatars,
    ...banners,
    ...FRAME_ITEMS,
    ...AVATAR_FX_ITEMS,
    ...BANNER_FX_ITEMS,
    ...NAME_STYLE_ITEMS,
    ...THEME_ITEMS,
    ...WALLPAPER_ITEMS,
  ];
}

export type Wallet = { earned: number; spent: number; balance: number; fromAchievements: number; fromHours: number; fromLevels: number };

/** Fichas ganhas: conquistas (igual ao XP), horas cheias jogadas e níveis. Nada disso é salvo: sai do estado. */
export function computeWallet(
  unlocks: Unlock[],
  tierOf: (u: Unlock) => Tier,
  stats: Record<string, GameStats>,
  level: number,
  inventory: string[],
  priceOf: (id: string) => number,
): Wallet {
  const fromAchievements = unlocks.reduce((a, u) => a + TIER_XP[tierOf(u)], 0);
  const seconds = Object.values(stats).reduce((a, s) => a + s.seconds, 0);
  const fromHours = Math.floor(seconds / 3600) * COINS_PER_HOUR;
  const fromLevels = level * COINS_PER_LEVEL;
  const earned = fromAchievements + fromHours + fromLevels;
  const spent = inventory.reduce((a, id) => a + priceOf(id), 0);
  return { earned, spent, balance: Math.max(0, earned - spent), fromAchievements, fromHours, fromLevels };
}

/** Destaques do dia: 4 itens pagos sorteados pela data (iguais para todo mundo no mesmo dia). */
export function dailyFeatured(items: ShopItem[], date = new Date()): ShopItem[] {
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let seed = 0;
  for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const pool = items.filter((i) => i.price > 0 && i.kind !== "theme");
  const picked: ShopItem[] = [];
  const kinds = new Set<ItemKind>();
  // um de cada categoria, se der
  for (let tries = 0; picked.length < 4 && tries < 200 && pool.length; tries++) {
    const it = pool[Math.floor(rand() * pool.length)];
    if (picked.includes(it) || (kinds.has(it.kind) && tries < 100)) continue;
    picked.push(it);
    kinds.add(it.kind);
  }
  return picked;
}
