import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { CATALOG, DEFAULT_STATE, LAUNCHER_ACHIEVEMENTS, LAUNCHER_ID, TIER_XP, unlockKey, XP_PER_LEVEL } from "./catalog";
import { launchGame, listenGameEvents, loadKey, notify, saveKey } from "./platform";
import { chime } from "./sound";
import type { AchievementDef, Game, GameStats, Persisted, Profile, Settings, Tier, Unlock } from "./types";

type Action =
  | { type: "hydrate"; state: Persisted }
  | { type: "profile"; patch: Partial<Profile> }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "select"; id: string }
  | { type: "addGame"; game: Game }
  | { type: "updateGame"; id: string; patch: Partial<Pick<Game, "title" | "cover" | "banner" | "url">> }
  | { type: "removeGame"; id: string }
  | { type: "started"; gameId: string; at: number }
  | { type: "session"; gameId: string; seconds: number }
  | { type: "unlock"; unlock: Unlock };

const EMPTY_STATS: GameStats = { seconds: 0, sessions: 0, longestSession: 0 };

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

function reducer(s: Persisted, a: Action): Persisted {
  switch (a.type) {
    case "hydrate":
      return a.state;
    case "profile":
      return { ...s, profile: { ...s.profile, ...a.patch } };
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
  }
}

export type Toast = { key: string; title: string; description: string; game: string; xp: number; tier: Tier };

type Ctx = {
  state: Persisted;
  ready: boolean;
  games: Game[];
  running: Set<string>;
  toasts: Toast[];
  dismissToast: (key: string) => void;
  dispatch: React.Dispatch<Action>;
  play: (game: Game) => Promise<void>;
  defsFor: (gameId: string) => AchievementDef[];
  describe: (u: Unlock) => { title: string; description: string; tier: Tier; hidden?: boolean };
  xp: number;
  level: number;
  levelProgress: number;
  gameTitle: (gameId: string) => string;
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // carrega o estado salvo (mescla com o padrão para campos novos de versões futuras)
  useEffect(() => {
    loadKey<Persisted>("state").then((saved) => {
      if (saved) {
        dispatch({
          type: "hydrate",
          state: {
            ...DEFAULT_STATE,
            ...saved,
            profile: { ...DEFAULT_STATE.profile, ...saved.profile },
            settings: { ...DEFAULT_STATE.settings, ...saved.settings },
          },
        });
      }
      setReady(true);
    });
  }, []);

  // salva a cada mudança, depois de carregado
  useEffect(() => {
    if (ready) void saveKey("state", state);
  }, [state, ready]);

  const games = useMemo<Game[]>(
    () => [...CATALOG.map((g) => ({ ...g, ...state.overrides[g.id] })), ...state.customGames],
    [state.overrides, state.customGames],
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
    (u: Unlock) => {
      const def = defsFor(u.gameId).find((d) => d.id === u.id);
      return {
        title: def?.title ?? u.title ?? u.id,
        description: def?.description ?? u.description ?? "",
        tier: def?.tier ?? ("comum" as Tier),
        hidden: def?.hidden,
      };
    },
    [defsFor],
  );

  const unlock = useCallback(
    (u: Unlock) => {
      const key = unlockKey(u.gameId, u.id);
      if (stateRef.current.unlocks[key]) return;
      dispatch({ type: "unlock", unlock: u });
      const d = describe(u);
      const toast: Toast = { key, title: d.title, description: d.description, game: gameTitle(u.gameId), xp: TIER_XP[d.tier], tier: d.tier };
      setToasts((ts) => [...ts, toast]);
      const { sound, notifications } = stateRef.current.settings;
      if (sound) chime(d.tier);
      if (notifications && !document.hasFocus()) void notify(`Conquista: ${d.title}`, `${toast.game}, +${toast.xp} XP`);
    },
    [describe, gameTitle],
  );

  const dismissToast = useCallback((key: string) => setToasts((ts) => ts.filter((t) => t.key !== key)), []);

  // eventos vindos do Rust (sessões e conquistas liberadas pelos jogos)
  useEffect(() => {
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
      unlocked: (p) =>
        unlock({ gameId: p.gameId, id: p.id, at: Date.now(), title: p.title ?? undefined, description: p.description ?? undefined, icon: p.icon ?? undefined }),
    }).then((fn) => (off = fn));
    return () => off();
  }, [unlock]);

  const play = useCallback(async (game: Game) => {
    await launchGame(game.id, game.url, game.title);
    // fora do app (navegador) não há evento de início: registra aqui
    if (!("__TAURI_INTERNALS__" in window)) dispatch({ type: "started", gameId: game.id, at: Date.now() });
  }, []);

  // conquistas do launcher, avaliadas a partir do próprio estado
  useEffect(() => {
    if (!ready) return;
    const s = state;
    const total = Object.values(s.stats).reduce((a, st) => a + st.seconds, 0);
    const longest = Math.max(0, ...Object.values(s.stats).map((st) => st.longestSession));
    const anyPlayed = Object.values(s.stats).some((st) => st.lastPlayed);
    const customized =
      !!s.profile.avatar || !!s.profile.banner || s.profile.avatarPreset !== 0 || s.settings.accent !== DEFAULT_STATE.settings.accent;
    const rules: Record<string, boolean> = {
      "bem-vindo": true,
      "primeira-partida": anyPlayed,
      "estilo-proprio": customized,
      colecionador: games.length >= 3,
      fiel: s.playDays.length >= 3,
      maratona: longest >= 2 * 3600,
      veterano: total >= 10 * 3600,
      cacador: Object.keys(s.unlocks).filter((k) => !k.startsWith(`${LAUNCHER_ID}:`)).length >= 10,
    };
    for (const [id, ok] of Object.entries(rules)) {
      if (ok && !s.unlocks[unlockKey(LAUNCHER_ID, id)]) unlock({ gameId: LAUNCHER_ID, id, at: Date.now() });
    }
  }, [state, ready, games.length, unlock]);

  const xp = useMemo(
    () => Object.values(state.unlocks).reduce((a, u) => a + TIER_XP[describe(u).tier], 0),
    [state.unlocks, describe],
  );
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelProgress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;

  const value: Ctx = {
    state,
    ready,
    games,
    running,
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
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
