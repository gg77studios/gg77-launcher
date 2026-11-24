import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { CATALOG, DEFAULT_STATE, LAUNCHER_ACHIEVEMENTS, LAUNCHER_ID, TIER_XP, unlockKey, XP_PER_LEVEL } from "./catalog";
import { mergeCloudProfile, migrateProfile, migrateSettings } from "./migrate";
import { buildShop, computeWallet, STARTER_AVATAR, type Wallet } from "./shop";
import {
  checkGame,
  closeGame,
  fetchRemoteCatalog,
  installGame,
  launchGame,
  launchInstalledGame,
  listenGameEvents,
  loadKey,
  notify,
  type PackageProgress,
  type PackageStatus,
  saveKey,
  uninstallGame,
  verifyGame,
} from "./platform";
import { chime } from "./sound";
import type { AchievementDef, Game, GameStats, ItemKind, Persisted, Profile, Settings, ShopItem, Tier, Unlock } from "./types";

type Action =
  | { type: "hydrate"; state: Persisted }
  | { type: "profile"; patch: Partial<Profile> }
  /** perfil da nuvem: os campos de lá valem, o inventário soma com o deste PC */
  | { type: "cloudProfile"; profile: Partial<Profile> }
  | { type: "buy"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "select"; id: string }
  | { type: "addGame"; game: Game }
  | { type: "updateGame"; id: string; patch: Partial<Pick<Game, "title" | "cover" | "banner" | "url">> }
  | { type: "removeGame"; id: string }
  | { type: "started"; gameId: string; at: number }
  | { type: "session"; gameId: string; seconds: number }
  | { type: "unlock"; unlock: Unlock }
  /** dados da nuvem (outro PC): conquistas que faltam entram sem aviso; tempo de jogo fica com o maior */
  | { type: "cloudMerge"; unlocks: Unlock[]; stats: Array<{ gameId: string; seconds: number; sessions: number; lastPlayed: number | null }> };

const EMPTY_STATS: GameStats = { seconds: 0, sessions: 0, longestSession: 0 };

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

function reducer(s: Persisted, a: Action): Persisted {
  switch (a.type) {
    case "hydrate":
      return a.state;
    case "profile":
      return { ...s, profile: { ...s.profile, ...a.patch } };
    case "cloudProfile":
      return { ...s, profile: mergeCloudProfile(s.profile, a.profile, s.unlocks) };
    case "buy": {
      const inv = s.profile.inventory ?? [];
      if (inv.includes(a.id)) return s;
      return { ...s, profile: { ...s.profile, inventory: [...inv, a.id] } };
    }
    case "settings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case "select":
      return { ...s, selectedGame: a.id };
    case "addGame":
      return { ...s, customGames: [...s.customGames, a.game], selectedGame: a.game.id };
    case "updateGame": {
      if (s.customGames.some((g) => g.id === a.id)) {
        return { ...s, customGames: s.customGames.map((g) => (g.id === a.id ? { ...g, ...a.patch } : g)) };
      }
      const { url: _url, ...rest } = a.patch;
      return { ...s, overrides: { ...s.overrides, [a.id]: { ...s.overrides[a.id], ...rest } } };
    }
    case "removeGame":
      return {
        ...s,
        customGames: s.customGames.filter((g) => g.id !== a.id),
        selectedGame: s.selectedGame === a.id ? CATALOG[0].id : s.selectedGame,
      };
    case "started": {
      const st = s.stats[a.gameId] ?? EMPTY_STATS;
      const day = dayKey(a.at);
      return {
        ...s,
        stats: { ...s.stats, [a.gameId]: { ...st, lastPlayed: a.at } },
        playDays: s.playDays.includes(day) ? s.playDays : [...s.playDays, day].slice(-400),
      };
    }
    case "session": {
      const st = s.stats[a.gameId] ?? EMPTY_STATS;
      return {
        ...s,
        stats: {
          ...s.stats,
          [a.gameId]: {
            ...st,
            seconds: st.seconds + a.seconds,
            sessions: st.sessions + 1,
            longestSession: Math.max(st.longestSession, a.seconds),
            lastPlayed: Date.now(),
          },
        },
      };
    }
    case "unlock": {
      const key = unlockKey(a.unlock.gameId, a.unlock.id);
      if (s.unlocks[key]) return s;
      return { ...s, unlocks: { ...s.unlocks, [key]: a.unlock } };
    }
    case "cloudMerge": {
      const unlocks = { ...s.unlocks };
      for (const u of a.unlocks) {
        const key = unlockKey(u.gameId, u.id);
        if (!unlocks[key] || u.at < unlocks[key].at) unlocks[key] = { ...unlocks[key], ...u };
      }
      const stats = { ...s.stats };
      for (const c of a.stats) {
        const st = stats[c.gameId] ?? EMPTY_STATS;
        stats[c.gameId] = {
          ...st,
          seconds: Math.max(st.seconds, c.seconds),
          sessions: Math.max(st.sessions, c.sessions),
          lastPlayed: Math.max(st.lastPlayed ?? 0, c.lastPlayed ?? 0) || undefined,
        };
      }
      return { ...s, unlocks, stats };
    }
  }
}

export type Toast = {
  key: string;
  title: string;
  description: string;
  game: string;
  xp: number;
  tier: Tier;
  /** fichas ganhas com a conquista */
  coins: number;
  icon?: string;
  pixel?: boolean;
};

/** Estado de um jogo instalável, no launcher. */
export type PackageState = Partial<PackageStatus> & {
  busy?: "install" | "uninstall" | "verify";
  progress?: PackageProgress;
  /** última falha de instalação/verificação, para mostrar ao usuário */
  message?: string;
};

export type Described = { title: string; description: string; tier: Tier; hidden?: boolean; icon?: string; pixel?: boolean };

/** Por que um item não pode ser comprado agora (ou vazio se pode). */
export type BuyBlock = { reason: "owned" | "level" | "coins"; text: string } | null;

/** Campo do perfil ou do ajuste que cada tipo de item ocupa ao ser usado. */
const SLOT: Partial<Record<ItemKind, keyof Profile>> = {
  avatar: "avatarId",
  banner: "banner",
  frame: "frame",
  avatarFx: "avatarFx",
  bannerFx: "bannerFx",
  nameStyle: "nameStyle",
};

type Ctx = {
  state: Persisted;
  ready: boolean;
  games: Game[];
  running: Set<string>;
  toasts: Toast[];
  dismissToast: (key: string) => void;
  dispatch: React.Dispatch<Action>;
  play: (game: Game) => Promise<void>;
  packages: Record<string, PackageState>;
  installPackage: (game: Game) => Promise<boolean>;
  uninstallPackage: (game: Game) => Promise<void>;
  verifyPackage: (game: Game) => Promise<void>;
  defsFor: (gameId: string) => AchievementDef[];
  describe: (u: Unlock) => Described;
  /** texto do título escolhido no perfil */
  titleText?: string;
  xp: number;
  level: number;
  levelProgress: number;
  gameTitle: (gameId: string) => string;
  /** imagem do banner atual do perfil; vazio = degradê padrão */
  bannerImage?: string;
  /**
   * Conquistas que contam: só de jogos da biblioteca e do launcher. Sobra de teste (o jogo "autoteste"
   * do E2E de pacotes) ou de jogo removido fica salva, mas não aparece nem rende XP e fichas.
   */
  unlocks: Record<string, Unlock>;
  /** a loja inteira (itens fixos + avatares e banners dos jogos) */
  shop: ShopItem[];
  item: (id: string | undefined) => ShopItem | undefined;
  owns: (id: string) => boolean;
  wallet: Wallet;
  canBuy: (item: ShopItem) => BuyBlock;
  buy: (item: ShopItem) => boolean;
  /** usa um item já possuído (ou tira, com id vazio); `bought` pula a checagem logo após comprar */
  equip: (kind: ItemKind, id: string | undefined, bought?: boolean) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore fora do StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [packages, setPackages] = useState<Record<string, PackageState>>({});
  const patchPkg = useCallback(
    (id: string, patch: Partial<PackageState>) => setPackages((p) => ({ ...p, [id]: { ...p[id], ...patch } })),
    [],
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // carrega o estado salvo (mescla com o padrão para campos novos de versões futuras)
  useEffect(() => {
    loadKey<Persisted>("state").then((saved) => {
      if (saved) {
        const unlocks = saved.unlocks ?? {};
        const settings = migrateSettings(saved.settings);
        // até a 0.5 o fundo sem arte do jogo era o degradê; agora é o fundo escolhido
        dispatch({
          type: "hydrate",
          state: { ...DEFAULT_STATE, ...saved, unlocks, profile: migrateProfile(saved.profile ?? {}, unlocks), settings },
        });
      }
      setReady(true);
    });
  }, []);

  // salva a cada mudança, depois de carregado
  useEffect(() => {
    if (ready) void saveKey("state", state);
  }, [state, ready]);

  // Catálogo remoto (GitHub Pages do gg77-builds): jogo novo e arte nova sem reinstalar o launcher.
  // A última cópia fica salva; sem internet vale ela, e sem nenhuma vale o catálogo embutido.
  const [remote, setRemote] = useState<Game[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadKey<Game[]>("catalog").then((cached) => {
      if (!cancelled && cached?.length) setRemote((r) => r ?? cached);
    });
    void fetchRemoteCatalog().then((list) => {
      if (cancelled || !list?.length) return;
      setRemote(list);
      void saveKey("catalog", list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo<Game[]>(() => {
    if (!remote) return CATALOG;
    // o remoto substitui o embutido jogo a jogo; jogos só do embutido continuam. Campo que um
    // catálogo remoto mais antigo não conhece (ex. avatars) vem do embutido.
    const ids = new Set(remote.map((g) => g.id));
    return [...remote.map((g) => ({ ...CATALOG.find((c) => c.id === g.id), ...g })), ...CATALOG.filter((g) => !ids.has(g.id))];
  }, [remote]);

  const games = useMemo<Game[]>(
    () => [...catalog.map((g) => ({ ...g, ...state.overrides[g.id] })), ...state.customGames],
    [catalog, state.overrides, state.customGames],
  );

  const gameTitle = useCallback(
    (gameId: string) => (gameId === LAUNCHER_ID ? "GG77 Launcher" : (games.find((g) => g.id === gameId)?.title ?? gameId)),
    [games],
  );

  const defsFor = useCallback(
    (gameId: string) => (gameId === LAUNCHER_ID ? LAUNCHER_ACHIEVEMENTS : (games.find((g) => g.id === gameId)?.achievements ?? [])),
    [games],
  );

  const describe = useCallback(
    (u: Unlock): Described => {
      const def = defsFor(u.gameId).find((d) => d.id === u.id);
      const game = games.find((g) => g.id === u.gameId);
      const rule = def?.icon || u.icon ? undefined : game?.iconRules?.find((r) => new RegExp(r.match).test(u.id));
      return {
        title: def?.title ?? u.title ?? u.id,
        description: def?.description ?? u.description ?? "",
        tier: def?.tier ?? ("comum" as Tier),
        hidden: def?.hidden,
        icon: def?.icon ?? u.icon ?? rule?.icon,
        pixel: !!game?.pixelArt,
      };
    },
    [defsFor, games],
  );

  // chaves já liberadas nesta sessão: protege contra eventos repetidos antes do estado atualizar
  const seenRef = useRef(new Set<string>());

  const unlock = useCallback(
    (u: Unlock) => {
      const key = unlockKey(u.gameId, u.id);
      if (stateRef.current.unlocks[key] || seenRef.current.has(key)) return;
      seenRef.current.add(key);
      dispatch({ type: "unlock", unlock: u });
      const d = describe(u);
      const toast: Toast = {
        key,
        title: d.title,
        description: d.description,
        game: gameTitle(u.gameId),
        xp: TIER_XP[d.tier],
        tier: d.tier,
        coins: TIER_XP[d.tier],
        icon: d.icon,
        pixel: d.pixel,
      };
      setToasts((ts) => (ts.some((t) => t.key === key) ? ts : [...ts, toast]));
      const { sound, notifications } = stateRef.current.settings;
      if (sound) chime(d.tier);
      if (notifications && !document.hasFocus()) void notify(`Conquista: ${d.title}`, `${toast.game}, +${toast.xp} XP e fichas`);
    },
    [describe, gameTitle],
  );

  const dismissToast = useCallback((key: string) => setToasts((ts) => ts.filter((t) => t.key !== key)), []);

  // eventos vindos do Rust (sessões e conquistas liberadas pelos jogos).
  // O registro é assíncrono: se o efeito for desfeito antes de terminar, desfaz assim que resolver,
  // senão ficam dois ouvintes e cada evento conta em dobro.
  const unlockRef = useRef(unlock);
  unlockRef.current = unlock;
  useEffect(() => {
    let cancelled = false;
    let off = () => {};
    listenGameEvents({
      started: (gameId) => {
        setRunning((r) => new Set(r).add(gameId));
        dispatch({ type: "started", gameId, at: Date.now() });
      },
      closed: (gameId, seconds) => {
        setRunning((r) => {
          const n = new Set(r);
          n.delete(gameId);
          return n;
        });
        dispatch({ type: "session", gameId, seconds });
      },
      progress: (p) => patchPkg(p.gameId, { progress: p }),
      updateRequested: (gameId) => updateRef.current(gameId),
      unlocked: (p) =>
        unlockRef.current({
          gameId: p.gameId,
          id: p.id,
          at: Date.now(),
          title: p.title ?? undefined,
          description: p.description ?? undefined,
          icon: p.icon ?? undefined,
        }),
    }).then((fn) => {
      if (cancelled) fn();
      else off = fn;
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const refreshPackage = useCallback(
    async (game: Game) => {
      if (!game.package) return;
      const st = await checkGame(game.id, game.package.manifest).catch(() => null);
      if (st) patchPkg(game.id, st);
    },
    [patchPkg],
  );

  const installPackage = useCallback(
    async (game: Game) => {
      if (!game.package) return false;
      patchPkg(game.id, { busy: "install", message: undefined, progress: undefined });
      try {
        await installGame(game.id, game.package.manifest);
        patchPkg(game.id, { busy: undefined, progress: undefined });
        await refreshPackage(game);
        return true;
      } catch (e) {
        patchPkg(game.id, { busy: undefined, progress: undefined, message: String(e) });
        return false;
      }
    },
    [patchPkg, refreshPackage],
  );

  const uninstallPackage = useCallback(
    async (game: Game) => {
      patchPkg(game.id, { busy: "uninstall", message: undefined });
      try {
        await uninstallGame(game.id);
      } finally {
        patchPkg(game.id, { busy: undefined });
        await refreshPackage(game);
      }
    },
    [patchPkg, refreshPackage],
  );

  const verifyPackage = useCallback(
    async (game: Game) => {
      patchPkg(game.id, { busy: "verify", message: undefined });
      try {
        const bad = await verifyGame(game.id);
        patchPkg(game.id, {
          busy: undefined,
          message: bad.length ? `${bad.length} arquivo(s) alterado(s) ou faltando. Reinstale o jogo.` : "Arquivos conferidos: tudo certo.",
        });
      } catch (e) {
        patchPkg(game.id, { busy: undefined, message: String(e) });
      }
    },
    [patchPkg],
  );

  // confere instalação e atualizações dos jogos com pacote ao abrir o launcher
  useEffect(() => {
    if (!ready) return;
    for (const g of games) void refreshPackage(g);
  }, [ready, games, refreshPackage]);

  const play = useCallback(
    async (game: Game) => {
      if (game.package && "__TAURI_INTERNALS__" in window) {
        const st = packagesRef.current[game.id];
        if (st?.installed) {
          await launchInstalledGame(game.id, game.title);
          return;
        }
        // manifesto fora do ar e o jogo ainda tem endereço web: usa a versão web enquanto isso
        if (!(st?.error && game.url)) {
          if (await installPackage(game)) await launchInstalledGame(game.id, game.title);
          return;
        }
      }
      await launchGame(game.id, game.url, game.title);
      // fora do app (navegador) não há evento de início: registra aqui
      if (!("__TAURI_INTERNALS__" in window)) dispatch({ type: "started", gameId: game.id, at: Date.now() });
    },
    [installPackage],
  );

  // o jogo pediu atualização (window.GG77.requestUpdate): fecha, atualiza e abre de novo
  const packagesRef = useRef(packages);
  packagesRef.current = packages;
  const gamesRef = useRef(games);
  gamesRef.current = games;
  const updateRef = useRef<(gameId: string) => void>(() => {});
  updateRef.current = async (gameId: string) => {
    const game = gamesRef.current.find((g) => g.id === gameId);
    if (!game?.package) return;
    await closeGame(gameId);
    if (await installPackage(game)) await launchInstalledGame(game.id, game.title);
  };

  // conquistas do launcher, avaliadas a partir do próprio estado
  useEffect(() => {
    if (!ready) return;
    const s = state;
    const total = Object.values(s.stats).reduce((a, st) => a + st.seconds, 0);
    const longest = Math.max(0, ...Object.values(s.stats).map((st) => st.longestSession));
    const anyPlayed = Object.values(s.stats).some((st) => st.lastPlayed);
    const customized =
      (s.profile.avatarId ?? STARTER_AVATAR) !== STARTER_AVATAR ||
      !!s.profile.banner ||
      s.settings.theme !== DEFAULT_STATE.settings.theme ||
      s.settings.accent !== DEFAULT_STATE.settings.accent;
    const rules: Record<string, boolean> = {
      "bem-vindo": true,
      "primeira-partida": anyPlayed,
      "estilo-proprio": customized,
      colecionador: games.length >= 3,
      fiel: s.playDays.length >= 3,
      maratona: longest >= 2 * 3600,
      veterano: total >= 10 * 3600,
      cacador: Object.values(s.unlocks).filter((u) => u.gameId !== LAUNCHER_ID && games.some((g) => g.id === u.gameId)).length >= 10,
      "primeira-compra": (s.profile.inventory ?? []).length > 0,
    };
    for (const [id, ok] of Object.entries(rules)) {
      if (ok && !s.unlocks[unlockKey(LAUNCHER_ID, id)]) unlock({ gameId: LAUNCHER_ID, id, at: Date.now() });
    }
  }, [state, ready, games.length, unlock]);

  const unlocks = useMemo(() => {
    const known = new Set([LAUNCHER_ID, ...games.map((g) => g.id)]);
    return Object.fromEntries(Object.entries(state.unlocks).filter(([, u]) => known.has(u.gameId)));
  }, [state.unlocks, games]);

  const xp = useMemo(
    () => Object.values(unlocks).reduce((a, u) => a + TIER_XP[describe(u).tier], 0),
    [unlocks, describe],
  );
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  const shop = useMemo(() => buildShop(games, defsFor), [games, defsFor]);
  const byId = useMemo(() => new Map(shop.map((i) => [i.id, i])), [shop]);
  const item = useCallback((id: string | undefined) => (id ? byId.get(id) : undefined), [byId]);

  const inventory = state.profile.inventory;
  const grants = state.profile.grants;
  const owned = useMemo(() => new Set([...(inventory ?? []), ...(grants ?? [])]), [inventory, grants]);
  const owns = useCallback((id: string) => owned.has(id) || byId.get(id)?.price === 0, [owned, byId]);

  const wallet = useMemo(
    () =>
      computeWallet(
        Object.values(unlocks),
        (u) => describe(u).tier,
        state.stats,
        level,
        inventory ?? [],
        (id) => byId.get(id)?.price ?? 0,
      ),
    [unlocks, state.stats, level, inventory, describe, byId],
  );

  const canBuy = useCallback(
    (it: ShopItem): BuyBlock => {
      if (owns(it.id)) return { reason: "owned", text: "Você já tem" };
      if (it.minLevel && level < it.minLevel) return { reason: "level", text: `Precisa do nível ${it.minLevel}` };
      if (wallet.balance < it.price) return { reason: "coins", text: `Faltam ${it.price - wallet.balance} fichas` };
      return null;
    },
    [owns, level, wallet.balance],
  );

  const buy = useCallback(
    (it: ShopItem) => {
      if (canBuy(it)) return false;
      dispatch({ type: "buy", id: it.id });
      if (stateRef.current.settings.sound) chime(it.rarity === "lendária" ? "épica" : it.rarity);
      return true;
    },
    [canBuy],
  );

  const equip = useCallback(
    (kind: ItemKind, id: string | undefined, bought?: boolean) => {
      if (id && !bought && !owns(id)) return;
      if (kind === "theme") dispatch({ type: "settings", patch: { theme: id ? id.slice("theme:".length) : DEFAULT_STATE.settings.theme } });
      else if (kind === "wallpaper") dispatch({ type: "settings", patch: { wallpaper: id ?? DEFAULT_STATE.settings.wallpaper, ambient: false } });
      else {
        const slot = SLOT[kind];
        if (slot) dispatch({ type: "profile", patch: { [slot]: id ?? (kind === "avatar" ? STARTER_AVATAR : undefined) } });
      }
    },
    [owns],
  );

  const bannerImage = item(state.profile.banner)?.image;

  const titleUnlock = state.profile.title ? unlocks[state.profile.title] : undefined;
  const titleText = titleUnlock ? describe(titleUnlock).title : undefined;
  const levelProgress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;

  const value: Ctx = {
    state,
    ready,
    games,
    running,
    packages,
    installPackage,
    uninstallPackage,
    verifyPackage,
    toasts,
    dismissToast,
    dispatch,
    play,
    defsFor,
    describe,
    xp,
    level,
    levelProgress,
    gameTitle,
    bannerImage,
    unlocks,
    titleText,
    shop,
    item,
    owns,
    wallet,
    canBuy,
    buy,
    equip,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
