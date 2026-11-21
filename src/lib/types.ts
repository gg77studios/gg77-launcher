export type Tier = "comum" | "rara" | "épica";

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  tier: Tier;
  /** escondida até ser liberada */
  hidden?: boolean;
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
  banner?: string;
  /** conquistas em destaque no perfil (chave gameId:id) */
  showcase: string[];
};

export type ThemeMode = "grafite" | "meia-noite" | "claro";

export type Settings = {
  theme: ThemeMode;
  accent: string;
  ambient: boolean;
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
