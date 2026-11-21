import type { AchievementDef, BannerDef, FrameDef, Game, Persisted, Tier } from "./types";

/** Põe o ícone de cada conquista a partir do id (arquivo com o mesmo nome na pasta). */
const withIcons = (dir: string, ext: string, list: AchievementDef[]): AchievementDef[] =>
  list.map((a) => ({ ...a, icon: `${dir}${a.id}${ext}` }));

const IDLE_ICONS = "/games/idle-legends/achievements/";

/** Jogos que já vêm no launcher. Para adicionar um novo jogo do grupo, inclua aqui. */
export const CATALOG: Game[] = [
  {
    id: "idle-legends",
    title: "Idle Legends",
    // só roda instalado pelo launcher (desde a virada de 2026-11-21 não existe mais versão web)
    url: "",
    package: { manifest: "https://github.com/gg77studios/gg77-builds/releases/download/catalog/idle-legends.json" },
    cover: "/games/idle-legends/cover.jpg",
    banner: "/games/idle-legends/banner.jpg",
    icon: "/games/idle-legends/icon.png",
    tint: "#1f2329",
    tagline: "RPG idle com arena, prestígio e hall da fama.",
    // O jogo envia estas conquistas pelo SDK (client/src/lib/launcher.js no repositório do jogo).
    // Os ids feat_* são os feitos do próprio jogo; os outros são momentos que só o launcher premia.
    // Outras conquistas do jogo (bestiário, chefes, pódio de evento, medalhas de ouro) chegam com
    // título próprio e aparecem como extras quando liberadas.
    // ícones: a arte de interface do próprio jogo (pixel art)
    pixelArt: true,
    achievements: withIcons(IDLE_ICONS, ".png", [
      { id: "primeira-vitoria", title: "Primeiro sangue", description: "Vença a primeira luta.", tier: "comum" },
      { id: "nivel-10", title: "Aventureiro", description: "Chegue ao nível 10.", tier: "comum" },
      { id: "lendario", title: "Brilho lendário", description: "Tenha um item lendário.", tier: "rara" },
      { id: "evento", title: "Presente no evento", description: "Participe de um evento.", tier: "comum" },
      { id: "feat_level_30", title: "No Auge", description: "Chegue ao nível 30.", tier: "rara" },
      { id: "feat_prestige_1", title: "Renascido", description: "Faça o primeiro prestígio.", tier: "rara" },
      { id: "feat_prestige_3", title: "Imortal", description: "Faça 3 prestígios.", tier: "épica" },
      { id: "feat_ruin_1", title: "Terra Arrasada", description: "300 abates numa única exploração de uma área.", tier: "comum" },
      { id: "feat_ruin_3", title: "Incendiário", description: "Terra Arrasada em 3 áreas.", tier: "rara" },
      { id: "feat_ruin_all", title: "Fim do Mundo", description: "Terra Arrasada em todas as áreas.", tier: "épica" },
      { id: "feat_farm_10", title: "Vigia", description: "10 horas de patrulha.", tier: "comum" },
      { id: "feat_farm_50", title: "Batedor", description: "50 horas de patrulha.", tier: "rara" },
      { id: "feat_farm_200", title: "Sentinela", description: "200 horas de patrulha.", tier: "épica" },
      { id: "feat_medals_all", title: "Colecionador", description: "Medalha de ouro em todos os inimigos comuns.", tier: "épica" },
      { id: "arena-top3", title: "Pódio da Arena", description: "Termine a temporada entre os 3 primeiros da Arena.", tier: "épica" },
      { id: "hall-da-fama", title: "Lenda da sala", description: "Entre para o hall da fama de uma sala.", tier: "épica", hidden: true },
    ]),
    // ícone das conquistas extras que o jogo manda (pelo prefixo do id)
    iconRules: [
      { match: "^bestiary_", icon: `${IDLE_ICONS}extra-bestiary.png` },
      { match: "^boss_slain_", icon: `${IDLE_ICONS}extra-boss.png` },
      { match: "^event_", icon: `${IDLE_ICONS}extra-event.png` },
      { match: "^rarity_", icon: `${IDLE_ICONS}extra-rarity.png` },
      { match: "^run_noheal", icon: `${IDLE_ICONS}extra-noheal.png` },
      { match: "^run_kills_", icon: `${IDLE_ICONS}extra-ruin.png` },
      { match: "^enemy_kills_", icon: `${IDLE_ICONS}extra-medal.png` },
      { match: ".", icon: `${IDLE_ICONS}extra-default.png` },
    ],
    // banners de perfil com a arte do próprio jogo, cada um liberado por uma conquista ligada a ele
    banners: [
      { id: "floresta", title: "Floresta Sombria", image: "/games/idle-legends/banners/floresta.jpg", unlock: "primeira-vitoria" },
      { id: "minas", title: "Minas", image: "/games/idle-legends/banners/minas.jpg", unlock: "nivel-10" },
      { id: "mercado", title: "Mercado", image: "/games/idle-legends/banners/mercado.jpg", unlock: "lendario" },
      { id: "cerejeiras", title: "Bosque das Cerejeiras", image: "/games/idle-legends/banners/cerejeiras.jpg", unlock: "evento" },
      { id: "cripta", title: "Cripta", image: "/games/idle-legends/banners/cripta.jpg", unlock: "feat_level_30" },
      { id: "pantano", title: "Pântano", image: "/games/idle-legends/banners/pantano.jpg", unlock: "feat_prestige_1" },
      { id: "floresta-chamas", title: "Floresta em chamas", image: "/games/idle-legends/banners/floresta-chamas.jpg", unlock: "feat_ruin_1" },
      { id: "bestiario", title: "Bestiário", image: "/games/idle-legends/banners/bestiario.jpg", unlock: "feat_farm_50" },
      { id: "caldeira", title: "Caldeira", image: "/games/idle-legends/banners/caldeira.jpg", unlock: "feat_prestige_3" },
      { id: "caldeira-arrasada", title: "Caldeira arrasada", image: "/games/idle-legends/banners/caldeira-arrasada.jpg", unlock: "feat_ruin_all" },
      { id: "arena", title: "Arena", image: "/games/idle-legends/banners/arena.jpg", unlock: "arena-top3" },
      { id: "salao", title: "Salão da fama", image: "/games/idle-legends/banners/salao.jpg", unlock: "hall-da-fama" },
    ],
  },
];

/** Banners do próprio launcher (arte gerada no Gemini), liberados pelas conquistas de uso. */
export const LAUNCHER_BANNERS: BannerDef[] = [
  { id: "padrao", title: "Padrão" },
  { id: "portao", title: "Portão da guilda", image: "/games/launcher/banners/portao.jpg", unlock: "bem-vindo" },
  { id: "colecao", title: "Estante da coleção", image: "/games/launcher/banners/colecao.jpg", unlock: "colecionador" },
  { id: "taverna", title: "Taverna dos amigos", image: "/games/launcher/banners/taverna.jpg", unlock: "fiel" },
  { id: "madrugada", title: "Madrugada", image: "/games/launcher/banners/madrugada.jpg", unlock: "maratona" },
  { id: "estrada", title: "Estrada", image: "/games/launcher/banners/estrada.jpg", unlock: "veterano" },
  { id: "trofeus", title: "Sala de troféus", image: "/games/launcher/banners/trofeus.jpg", unlock: "cacador" },
];

export const bannerRef = (gameId: string, bannerId: string) => `ref:${gameId}:${bannerId}`;

/** Conquistas do próprio launcher: liberadas pelo uso, sem precisar de integração. */
export const LAUNCHER_ID = "launcher";

export const LAUNCHER_ACHIEVEMENTS: AchievementDef[] = withIcons("/games/launcher/achievements/", ".jpg", [
  { id: "bem-vindo", title: "Bem-vindo à guilda", description: "Abra o launcher pela primeira vez.", tier: "comum" },
  { id: "primeira-partida", title: "Apertou o play", description: "Abra um jogo pelo launcher.", tier: "comum" },
  { id: "estilo-proprio", title: "Estilo próprio", description: "Troque o avatar, o banner ou a cor do launcher.", tier: "comum" },
  { id: "colecionador", title: "Colecionador", description: "Tenha 3 jogos na biblioteca.", tier: "comum" },
  { id: "fiel", title: "Frequentador", description: "Jogue em 3 dias diferentes.", tier: "rara" },
  { id: "maratona", title: "Maratona", description: "Fique 2 horas seguidas num jogo.", tier: "rara" },
  { id: "veterano", title: "Dez horas de estrada", description: "Some 10 horas de jogo.", tier: "épica" },
  { id: "cacador", title: "Caçador de troféus", description: "Libere 10 conquistas.", tier: "épica" },
]);

/** Molduras do avatar. Cada uma é liberada por nível, por uma conquista ou por ter uma conquista épica. */
export const FRAMES: FrameDef[] = [
  { id: "vidro", name: "Vidro" },
  { id: "neon", name: "Neon", unlock: { kind: "level", level: 3 } },
  { id: "pixel", name: "Pixel", unlock: { kind: "achievement", gameId: "idle-legends", id: "primeira-vitoria" } },
  { id: "chamas", name: "Chamas", unlock: { kind: "achievement", gameId: "idle-legends", id: "feat_ruin_1" } },
  { id: "ouro", name: "Ouro", unlock: { kind: "tier", tier: "épica" } },
  { id: "gladiador", name: "Gladiador", unlock: { kind: "achievement", gameId: "idle-legends", id: "arena-top3" } },
  { id: "holografica", name: "Holográfica", unlock: { kind: "level", level: 10 } },
];

export const TIER_XP: Record<Tier, number> = { comum: 10, rara: 25, épica: 50 };

export const XP_PER_LEVEL = 100;

export const ACCENTS = [
  { name: "Neon", value: "#d4ff3f" },
  { name: "Coral", value: "#ff6b4a" },
  { name: "Gelo", value: "#5ad8ff" },
  { name: "Chiclete", value: "#ff5fa2" },
  { name: "Âmbar", value: "#ffb020" },
  { name: "Lavanda", value: "#a78bfa" },
];

export const AVATAR_PRESETS = [
  { bg: "#d4ff3f", fg: "#14161b" },
  { bg: "#ff6b4a", fg: "#14161b" },
  { bg: "#5ad8ff", fg: "#14161b" },
  { bg: "#ff5fa2", fg: "#14161b" },
  { bg: "#ffb020", fg: "#14161b" },
  { bg: "#a78bfa", fg: "#14161b" },
];

export const DEFAULT_STATE: Persisted = {
  profile: { nickname: "Jogador", bio: "", avatarPreset: 0, showcase: [] },
  settings: { theme: "grafite", accent: ACCENTS[0].value, ambient: true, glass: "liquido", sound: true, notifications: true },
  customGames: [],
  overrides: {},
  stats: {},
  unlocks: {},
  playDays: [],
  selectedGame: CATALOG[0].id,
};

export const unlockKey = (gameId: string, id: string) => `${gameId}:${id}`;

export function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "jogo"
  );
}
