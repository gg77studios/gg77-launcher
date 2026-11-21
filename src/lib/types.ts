export type Tier = "comum" | "rara" | "épica";

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  tier: Tier;
  /** escondida até ser liberada */
  hidden?: boolean;
  /** ícone quadrado da conquista */
  icon?: string;
};

export type FrameUnlock =
  | { kind: "level"; level: number }
  | { kind: "achievement"; gameId: string; id: string }
  | { kind: "tier"; tier: Tier };

/** Moldura do avatar; sem regra de liberação, já vem liberada. */
export type FrameDef = { id: string; name: string; unlock?: FrameUnlock };

/** Banner de perfil que o jogo oferece; liberado por uma conquista do mesmo jogo. */
export type BannerDef = {
  id: string;
  title: string;
  /** imagem 3:1; sem imagem, usa o degradê da cor de destaque */
  image?: string;
  /** id da conquista (do mesmo jogo) que libera; sem isso, já vem liberado */
  unlock?: string;
};

export type Game = {
  id: string;
  title: string;
  url: string;
  /** capa vertical (2:3) e banner largo (16:9); URL ou data URL */
  cover?: string;
  banner?: string;
  icon?: string;
  /** cor de fundo quando não há imagem */
  tint: string;
  tagline?: string;
  achievements: AchievementDef[];
  /** ícone para conquistas que chegam sem catálogo, pelo prefixo do id (regex) */
  iconRules?: Array<{ match: string; icon: string }>;
  /** ícones em pixel art: desenhar sem suavizar */
  pixelArt?: boolean;
  banners?: BannerDef[];
  /** adicionado pelo usuário (pode ser removido) */
  custom?: boolean;
};

export type Unlock = {
  gameId: string;
  id: string;
  at: number;
  /** título enviado pelo jogo, quando a conquista não está no catálogo */
  title?: string;
  description?: string;
  icon?: string;
};

export type UnlockPayload = {
  gameId: string;
  id: string;
  title: string | null;
  description: string | null;
  icon: string | null;
};

export type GameStats = {
  seconds: number;
  sessions: number;
  lastPlayed?: number;
  longestSession: number;
};

export type Profile = {
  nickname: string;
  bio: string;
  avatar?: string;
  /** preset de avatar quando não há imagem */
  avatarPreset: number;
  /** imagem própria (data URL ou endereço) ou banner liberado, no formato "ref:<jogo>:<banner>" */
  banner?: string;
  /** conquistas em destaque no perfil (chave gameId:id) */
  showcase: string[];
  /** moldura do avatar (id de FRAMES) */
  frame?: string;
  /** título exibido sob o apelido: a chave gameId:id de uma conquista liberada */
  title?: string;
};

export type ThemeMode = "grafite" | "meia-noite" | "claro";

export type Settings = {
  theme: ThemeMode;
  accent: string;
  ambient: boolean;
  /** vidro líquido (translúcido) ou sólido (sem transparência, mais leve e com mais contraste) */
  glass: "liquido" | "solido";
  sound: boolean;
  notifications: boolean;
};

export type Persisted = {
  profile: Profile;
  settings: Settings;
  customGames: Game[];
  /** ajustes do usuário em jogos do catálogo (capa, banner, nome) */
  overrides: Record<string, Partial<Pick<Game, "title" | "cover" | "banner">>>;
  stats: Record<string, GameStats>;
  unlocks: Record<string, Unlock>;
  /** dias (AAAA-MM-DD) em que jogou algo */
  playDays: string[];
  selectedGame: string;
};
