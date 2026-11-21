/* Cliente do GG77 Hub (contas, nuvem, amigos, presença). O refresh token fica salvo no store do
   launcher; o token de acesso (15 min) só na memória, e é repassado ao Rust para o login único
   dos jogos (get_game_session). */

import { isTauri, loadKey, saveKey } from "./platform";
import type { Profile, Unlock } from "./types";

export const HUB_URL = (import.meta.env.VITE_HUB_URL as string | undefined) ?? "https://gg77.forjahub.online";

export type HubUser = { id: string; nickname: string; profile: Partial<Profile> };
export type Presence = { status: "online" | "playing" | "offline"; gameId: string | null; lastSeen: number | null };
export type FriendCard = { nickname: string; profile: Partial<Profile>; presence: Presence };
export type CloudStat = { gameId: string; seconds: number; sessions: number; lastPlayed: number | null };
export type CloudLibrary = { achievements: Unlock[]; stats: CloudStat[] };
export type UserPage = FriendCard & CloudLibrary & { friendship: "self" | "friends" | "pending" | "none" };

type Saved = { refreshToken: string; user: HubUser };

export class HubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let saved: Saved | null = null;
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

async function pushToRust(token: string | null) {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_hub_session", { url: token ? HUB_URL : null, token }).catch(() => {});
}

async function setSession(data: { user: HubUser; accessToken: string; refreshToken: string } | null) {
  saved = data ? { refreshToken: data.refreshToken, user: data.user } : null;
  accessToken = data?.accessToken ?? null;
  await saveKey("hub", saved);
  await pushToRust(accessToken);
}

async function raw(method: string, path: string, body?: unknown, token?: string | null) {
  let res: Response;
  try {
    res = await fetch(HUB_URL + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HubError("Sem conexão com a conta GG77.", 0);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new HubError(data?.error ?? `Erro ${res.status}`, res.status);
  return data;
}

/** Troca o refresh por um par novo. false = sessão acabou (precisa entrar de novo). */
async function refresh(): Promise<boolean> {
  if (!saved) return false;
  if (!refreshing) {
    refreshing = raw("POST", "/auth/refresh", { refreshToken: saved.refreshToken })
      .then(async (data) => {
        await setSession(data);
        return true;
      })
      .catch(async (e: HubError) => {
        // sem internet a sessão continua salva; só 401 encerra
        if (e.status === 401) await setSession(null);
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Chamada autenticada; renova o token uma vez se ele tiver vencido. */
async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  if (!saved) throw new HubError("Entre na sua conta GG77.", 401);
  if (!accessToken && !(await refresh())) throw new HubError("Sem conexão com a conta GG77.", 0);
  try {
    return await raw(method, path, body, accessToken);
  } catch (e) {
    if (e instanceof HubError && e.status === 401 && (await refresh())) return raw(method, path, body, accessToken);
    throw e;
  }
}

export const hub = {
  /** Conta salva neste PC (sem rede); null = não entrou. */
  async restore(): Promise<HubUser | null> {
    saved = (await loadKey<Saved>("hub")) ?? null;
    if (saved) void refresh();
    return saved?.user ?? null;
  },
  get user() {
    return saved?.user ?? null;
  },
  /** Renova o token de acesso antes de vencer (o login único dos jogos usa ele). */
  keepAlive: () => refresh(),
  async login(nickname: string, password: string) {
    await setSession(await raw("POST", "/auth/login", { nickname, password }));
    return saved!.user;
  },
  async register(nickname: string, password: string) {
    await setSession(await raw("POST", "/auth/register", { nickname, password }));
    return saved!.user;
  },
  async logout() {
    const token = saved?.refreshToken;
    if (accessToken) await raw("DELETE", "/presence", undefined, accessToken).catch(() => {});
    if (token) await raw("POST", "/auth/logout", { refreshToken: token }).catch(() => {});
    await setSession(null);
  },
  library: () => call<CloudLibrary>("GET", "/me/library"),
  importLocal: (achievements: Unlock[], stats: CloudStat[]) => call<CloudLibrary>("POST", "/me/import", { achievements, stats }),
  pushAchievements: (items: Unlock[]) => call<{ added: number }>("POST", "/me/achievements", { items }),
  pushSessions: (gameId: string, seconds: number, sessions: number) => call("POST", "/me/sessions", { gameId, seconds, sessions }),
  me: () => call<HubUser>("GET", "/me"),
  saveProfile: (profile: Profile) => call<HubUser>("PUT", "/me/profile", { profile }),
  presence: (gameId: string | null) => call("POST", "/presence", gameId ? { status: "playing", gameId } : { status: "online" }),
  friends: () => call<{ friends: FriendCard[]; incoming: FriendCard[]; outgoing: FriendCard[] }>("GET", "/friends"),
  addFriend: (nickname: string) => call<{ status: "pending" | "accepted" }>("POST", "/friends/requests", { nickname }),
  acceptFriend: (nickname: string) => call("POST", `/friends/requests/${encodeURIComponent(nickname)}/accept`),
  removeFriend: (nickname: string) => call("DELETE", `/friends/${encodeURIComponent(nickname)}`),
  search: (q: string) => call<{ users: Array<{ nickname: string; profile: Partial<Profile> }> }>("GET", `/users?search=${encodeURIComponent(q)}`),
  userPage: (nickname: string) => call<UserPage>("GET", `/users/${encodeURIComponent(nickname)}`),
};
