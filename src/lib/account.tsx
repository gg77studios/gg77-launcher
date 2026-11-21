/* Conta GG77 no launcher: entra/sai, sincroniza com a nuvem e mantém a presença.

   Sincronização por diferença: guardamos (por conta) o que já foi para a nuvem. A cada mudança
   no estado local, o que passou desse retrato é enviado; se falhar (sem internet), o retrato não
   anda e a diferença vai na próxima tentativa. Ao entrar, a nuvem é trazida (cloudMerge) e, na
   primeira vez neste PC, o histórico local sobe (import). */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { hub, type HubUser } from "./hub";
import { loadKey, saveKey } from "./platform";
import { useStore } from "./state";
import type { Persisted, Profile } from "./types";

type SyncState = "off" | "syncing" | "ok" | "offline";

type Ctx = {
  user: HubUser | null;
  /** a conta salva neste PC já foi lida (antes disso, nem biblioteca nem tela de entrada) */
  restored: boolean;
  sync: SyncState;
  login: (nickname: string, password: string, mode: "login" | "register") => Promise<void>;
  logout: () => Promise<void>;
};

const AccountCtx = createContext<Ctx | null>(null);

export function useAccount() {
  const ctx = useContext(AccountCtx);
  if (!ctx) throw new Error("useAccount fora do AccountProvider");
  return ctx;
}

type Snapshot = { unlocks: string[]; stats: Record<string, { seconds: number; sessions: number }> };

const snapshotOf = (s: Persisted): Snapshot => ({
  unlocks: Object.keys(s.unlocks),
  stats: Object.fromEntries(Object.entries(s.stats).map(([g, st]) => [g, { seconds: st.seconds, sessions: st.sessions }])),
});

const snapKey = (userId: string) => `hubSync:${userId}`;
const PRESENCE_MS = 60_000;
const KEEPALIVE_MS = 10 * 60_000;

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { state, ready, dispatch, running } = useStore();
  const [user, setUser] = useState<HubUser | null>(null);
  const [restored, setRestored] = useState(false);
  const [sync, setSync] = useState<SyncState>("off");
  const [synced, setSynced] = useState(false);
  const snapRef = useRef<Snapshot | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const busy = useRef(false);

  useEffect(() => {
    void hub.restore().then((u) => {
      setUser(u);
      setRestored(true);
    });
  }, []);

  /** Manda o que mudou desde o último retrato. */
  const push = useCallback(async () => {
    const u = hub.user;
    const snap = snapRef.current;
    if (!u || !snap || busy.current) return;
    busy.current = true;
    try {
      const s = stateRef.current;
      const known = new Set(snap.unlocks);
      const fresh = Object.entries(s.unlocks).filter(([k]) => !known.has(k));
      if (fresh.length) {
        await hub.pushAchievements(fresh.map(([, v]) => v));
        snap.unlocks = [...snap.unlocks, ...fresh.map(([k]) => k)];
      }
      for (const [gameId, st] of Object.entries(s.stats)) {
        const before = snap.stats[gameId] ?? { seconds: 0, sessions: 0 };
        const sessions = st.sessions - before.sessions;
        if (sessions <= 0) continue;
        await hub.pushSessions(gameId, Math.max(0, st.seconds - before.seconds), Math.min(sessions, 100));
        snap.stats[gameId] = { seconds: st.seconds, sessions: st.sessions };
      }
      await saveKey(snapKey(u.id), snap);
      setSync("ok");
    } catch {
      setSync("offline");
    } finally {
      busy.current = false;
    }
  }, []);

  // ao entrar (ou abrir o launcher já com conta): traz a nuvem, sobe o histórico na 1ª vez
  useEffect(() => {
    if (!user || !ready) return;
    let cancelled = false;
    setSynced(false);
    setSync("syncing");
    (async () => {
      try {
        const saved = await loadKey<Snapshot>(snapKey(user.id));
        const s = stateRef.current;
        let lib;
        if (saved) {
          // primeiro o que ficou pendente aqui (sessões offline), depois o que veio de outros PCs
          snapRef.current = saved;
          await push();
          lib = await hub.library();
        } else {
          // primeira vez desta conta neste PC: o histórico local sobe inteiro
          lib = await hub.importLocal(
            Object.values(s.unlocks),
            Object.entries(s.stats).map(([gameId, st]) => ({ gameId, seconds: st.seconds, sessions: st.sessions, lastPlayed: st.lastPlayed ?? null })),
          );
          snapRef.current = snapshotOf(s);
        }
        if (cancelled) return;
        dispatch({ type: "cloudMerge", unlocks: lib.achievements, stats: lib.stats });
        // o retrato acompanha a nuvem: o que veio de lá não volta como diferença
        const snap = snapRef.current!;
        const known = new Set(snap.unlocks);
        for (const u of lib.achievements) if (!known.has(`${u.gameId}:${u.id}`)) snap.unlocks.push(`${u.gameId}:${u.id}`);
        for (const c of lib.stats) {
          const b = snap.stats[c.gameId] ?? { seconds: 0, sessions: 0 };
          snap.stats[c.gameId] = { seconds: Math.max(b.seconds, c.seconds), sessions: Math.max(b.sessions, c.sessions) };
        }
        await saveKey(snapKey(user.id), snap);
        // perfil: o da nuvem vale; conta nova recebe o deste PC
        const me = await hub.me();
        if (me.profile && Object.keys(me.profile).length) dispatch({ type: "profile", patch: me.profile as Partial<Profile> });
        else {
          // conta nova: o perfil deste PC sobe, com o apelido da conta se o perfil ainda não tinha
          const profile = s.profile.nickname ? s.profile : { ...s.profile, nickname: user.nickname };
          if (profile !== s.profile) dispatch({ type: "profile", patch: { nickname: user.nickname } });
          await hub.saveProfile(profile);
        }
        setSynced(true);
        setSync("ok");
      } catch {
        if (!cancelled) setSync("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, ready, dispatch, push]);

  // mudança local (conquista, fim de sessão): envia em 3 s
  useEffect(() => {
    if (!synced) return;
    const t = window.setTimeout(() => void push(), 3000);
    return () => window.clearTimeout(t);
  }, [state.unlocks, state.stats, synced, push]);

  // perfil editado: salva na nuvem em 2 s
  const firstProfile = useRef(true);
  useEffect(() => {
    if (!synced) return;
    if (firstProfile.current) {
      firstProfile.current = false;
      return;
    }
    const t = window.setTimeout(() => void hub.saveProfile(state.profile).catch(() => setSync("offline")), 2000);
    return () => window.clearTimeout(t);
  }, [state.profile, synced]);

  // presença: agora e a cada 60 s; jogando = o primeiro jogo aberto
  const playing = [...running][0] ?? null;
  useEffect(() => {
    if (!user) return;
    const beat = () => void hub.presence(playing).catch(() => {});
    beat();
    const t = window.setInterval(beat, PRESENCE_MS);
    return () => window.clearInterval(t);
  }, [user, playing]);

  // token de acesso sempre válido para o login único dos jogos
  useEffect(() => {
    if (!user) return;
    const t = window.setInterval(() => void hub.keepAlive(), KEEPALIVE_MS);
    return () => window.clearInterval(t);
  }, [user]);

  const login = useCallback(async (nickname: string, password: string, mode: "login" | "register") => {
    const u = mode === "login" ? await hub.login(nickname, password) : await hub.register(nickname, password);
    firstProfile.current = true;
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await hub.logout();
    snapRef.current = null;
    setSynced(false);
    setSync("off");
    setUser(null);
  }, []);

  return <AccountCtx.Provider value={{ user, restored, sync, login, logout }}>{children}</AccountCtx.Provider>;
}
