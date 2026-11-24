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

/** Raridade dos itens da loja: define o preço. */
export type Rarity = "comum" | "rara" | "épica" | "lendária";

/** Banner de perfil que o jogo oferece; vendido na loja do launcher. */
export type BannerDef = {
  id: string;
  title: string;
  /** imagem 3:1; sem imagem, usa o degradê da cor de destaque */
  image?: string;
  /** raridade na loja; sem ela, vale a raridade da conquista em `unlock` (ou "rara") */
  rarity?: Rarity;
  /** coleção temática na loja (filtro), ex. "sandbox" */
  collection?: string;
  /**
   * Legado (até a 0.5): conquista do mesmo jogo que liberava o banner. Hoje só serve para
   * a migração (quem já tinha liberado ganha o banner) e para sugerir a raridade.
   */
  unlock?: string;
};

/** Avatar pronto que o jogo oferece na loja (retrato quadrado). */
export type AvatarDef = { id: string; name: string; image: string; rarity?: Rarity; collection?: string };

/** Categorias de itens da loja. */
export type ItemKind = "avatar" | "banner" | "frame" | "avatarFx" | "bannerFx" | "nameStyle" | "theme" | "wallpaper";

/** Item da loja. O id é `<kind>:<resto>` e é o que fica salvo no perfil e no inventário. */
export type ShopItem = {
  id: string;
  kind: ItemKind;
  name: string;
  rarity: Rarity;
  /** preço em fichas; 0 = de graça, já vem com a conta */
  price: number;
  /** imagem (avatar, banner) */
  image?: string;
  /** desenhar sem suavizar (pixel art) */
  pixel?: boolean;
  /** jogo de origem (filtro da loja) */
  gameId?: string;
  /** nível mínimo para comprar */
  minLevel?: number;
  /** coleção temática (filtro da loja), ex. "sandbox" */
  collection?: string;
  /** frase curta na loja */
  description?: string;
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
  /** avatares prontos com a arte do jogo, vendidos na loja */
  avatars?: AvatarDef[];
  /** jogo instalável: manifesto assinado com o pacote da versão atual */
  package?: { manifest: string };
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
  /** avatar escolhido (id de item da loja, ex. "avatar:ini-0") */
  avatarId?: string;
  /** banner (id de item "banner:<jogo>:<banner>"); vazio = degradê da cor de destaque */
  banner?: string;
  /** conquistas em destaque no perfil (chave gameId:id) */
  showcase: string[];
  /** moldura do avatar (id de item "frame:<id>") */
  frame?: string;
  /** efeito animado em volta do avatar ("avatarFx:<id>") */
  avatarFx?: string;
  /** efeito animado sobre o banner ("bannerFx:<id>") */
  bannerFx?: string;
  /** estilo do apelido ("nameStyle:<id>") */
  nameStyle?: string;
  /** título exibido sob o apelido: a chave gameId:id de uma conquista liberada */
  title?: string;
  /** itens comprados na loja (contam no gasto) */
  inventory?: string[];
  /** itens ganhos sem pagar (o que já estava liberado antes da loja) */
  grants?: string[];
  /** legado (até a 0.5): foto enviada pelo usuário e cor do avatar de iniciais */
  avatar?: string;
  avatarPreset?: number;
};

/** Temas grátis; os da loja usam o id do item sem o prefixo ("floresta", "synthwave"...). */
export type ThemeMode = "grafite" | "meia-noite" | "claro" | (string & {});

export type LibraryLayout = "carrossel" | "grade" | "lista";

export type Settings = {
  theme: ThemeMode;
  accent: string;
  /** fundo: arte do jogo selecionado (true) ou o fundo escolhido em `wallpaper` */
  ambient: boolean;
  /** fundo quando `ambient` está desligado: item "wallpaper:<id>" ou um banner comprado */
  wallpaper: string;
  /** vidro líquido (translúcido) ou sólido (sem transparência, mais leve e com mais contraste) */
  glass: "liquido" | "solido";
  sound: boolean;
  notifications: boolean;
  library: { layout: LibraryLayout; size: "p" | "m" | "g"; sort: "padrao" | "recente" | "nome" | "tempo" };
  sidebar: { mode: "expandida" | "compacta"; side: "esquerda" | "direita" };
  font: "figtree" | "nunito" | "space-grotesk" | "pixelify";
  density: "confortavel" | "compacta";
  corners: "arredondado" | "reto";
  /** animações de perfil: em todo lugar, só no meu perfil, ou nenhuma */
  motion: "tudo" | "meu-perfil" | "nada";
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
