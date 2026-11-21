import type { AchievementDef, Game, Persisted, Tier } from "./types";

/** Jogos que já vêm no launcher. Para adicionar um novo jogo do grupo, inclua aqui. */
export const CATALOG: Game[] = [
  {
    id: "idle-legends",
    title: "Idle Legends",
    url: "https://arena.forjahub.online",
    cover: "/games/idle-legends/cover.jpg",
    banner: "/games/idle-legends/banner.jpg",
    icon: "/games/idle-legends/icon.png",
    tint: "#1f2329",
    tagline: "RPG idle com arena, prestígio e hall da fama.",
    // o jogo libera estas conquistas chamando window.GG77?.unlock(id) (ver docs/SDK.md)
    achievements: [
      { id: "primeira-vitoria", title: "Primeiro sangue", description: "Vença a primeira luta.", tier: "comum" },
      { id: "nivel-10", title: "Aventureiro", description: "Chegue ao nível 10.", tier: "comum" },
      { id: "nivel-50", title: "Veterano das masmorras", description: "Chegue ao nível 50.", tier: "rara" },
      { id: "prestigio", title: "Renascido", description: "Faça o primeiro prestígio.", tier: "rara" },
      { id: "lendario", title: "Brilho lendário", description: "Encontre um item lendário.", tier: "rara" },
      { id: "evento", title: "Presente no evento", description: "Participe de um evento da temporada.", tier: "comum" },
      { id: "arena-top3", title: "Pódio da Arena", description: "Termine a temporada entre os 3 primeiros da Arena.", tier: "épica" },
      { id: "hall-da-fama", title: "Imortal", description: "Entre para o hall da fama.", tier: "épica", hidden: true },
    ],
  },
];

/** Conquistas do próprio launcher: liberadas pelo uso, sem precisar de integração. */
export const LAUNCHER_ID = "launcher";

export const LAUNCHER_ACHIEVEMENTS: AchievementDef[] = [
  { id: "bem-vindo", title: "Bem-vindo à guilda", description: "Abra o launcher pela primeira vez.", tier: "comum" },
  { id: "primeira-partida", title: "Apertou o play", description: "Abra um jogo pelo launcher.", tier: "comum" },
  { id: "estilo-proprio", title: "Estilo próprio", description: "Troque o avatar, o banner ou a cor do launcher.", tier: "comum" },
  { id: "colecionador", title: "Colecionador", description: "Tenha 3 jogos na biblioteca.", tier: "comum" },
  { id: "fiel", title: "Frequentador", description: "Jogue em 3 dias diferentes.", tier: "rara" },
  { id: "maratona", title: "Maratona", description: "Fique 2 horas seguidas num jogo.", tier: "rara" },
  { id: "veterano", title: "Dez horas de estrada", description: "Some 10 horas de jogo.", tier: "épica" },
  { id: "cacador", title: "Caçador de troféus", description: "Libere 10 conquistas.", tier: "épica" },
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
  settings: { theme: "grafite", accent: ACCENTS[0].value, ambient: true, sound: true, notifications: true },
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
