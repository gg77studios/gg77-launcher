/* Ponte com o Tauri. Fora do app (npm run dev no navegador) tudo cai para
   localStorage e window.open, para dar para desenvolver a interface sem compilar o Rust. */

import type { Game, UnlockPayload } from "./types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const STORE_FILE = "gg77.json";
const LS_PREFIX = "gg77:";

type StoreLike = { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> };

let storePromise: Promise<StoreLike> | null = null;

function store(): Promise<StoreLike> {
  if (!storePromise) {
    storePromise = isTauri
      ? import("@tauri-apps/plugin-store").then((m) => m.load(STORE_FILE, { autoSave: 300, defaults: {} }))
      : Promise.resolve<StoreLike>({
          async get<T>(key: string) {
            try {
              const raw = localStorage.getItem(LS_PREFIX + key);
              return raw ? (JSON.parse(raw) as T) : undefined;
            } catch {
              return undefined;
            }
          },
          async set(key: string, value: unknown) {
            try {
              localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
            } catch {
              /* armazenamento cheio ou bloqueado: segue sem persistir */
            }
          },
        });
  }
  return storePromise;
}

export async function loadKey<T>(key: string): Promise<T | undefined> {
  return (await store()).get<T>(key);
}

export async function saveKey(key: string, value: unknown) {
  await (await store()).set(key, value);
}

export async function launchGame(gameId: string, url: string, title: string) {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("launch_game", { gameId, url, title });
  } else {
    window.open(url, "_blank", "noopener");
  }
}

export async function closeGame(gameId: string) {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("close_game", { gameId });
}

/* ---------- jogos instalados (pacotes) ---------- */

export type PackageStatus = {
  installed: string | null;
  latest: string | null;
  size: number | null;
  updateAvailable: boolean;
  /** erro ao consultar o manifesto (sem internet, servidor fora...) */
  error: string | null;
};

export type PackageProgress = { gameId: string; phase: "download" | "extract" | "done"; received: number; total: number };

async function invokeCmd<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/** Estado do pacote; fora do app (navegador) não há instalação. */
export async function checkGame(gameId: string, manifestUrl: string): Promise<PackageStatus | null> {
  if (!isTauri) return null;
  return invokeCmd<PackageStatus>("check_game", { gameId, manifestUrl });
}

export async function installGame(gameId: string, manifestUrl: string): Promise<string> {
  return invokeCmd<string>("install_game", { gameId, manifestUrl });
}

export async function uninstallGame(gameId: string): Promise<void> {
  await invokeCmd("uninstall_game", { gameId });
}

/** Devolve os arquivos que não conferem com o que foi instalado. */
export async function verifyGame(gameId: string): Promise<string[]> {
  return invokeCmd<string[]>("verify_game", { gameId });
}

export async function launchInstalledGame(gameId: string, title: string): Promise<void> {
  await invokeCmd("launch_installed_game", { gameId, title });
}

type Handlers = {
  started: (gameId: string) => void;
  closed: (gameId: string, seconds: number) => void;
  unlocked: (p: UnlockPayload) => void;
  progress: (p: PackageProgress) => void;
  updateRequested: (gameId: string) => void;
};

/** Escuta os eventos que o Rust manda para a janela principal. */
export async function listenGameEvents(h: Handlers): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const offs = await Promise.all([
    listen<string>("game-started", (e) => h.started(e.payload)),
    listen<{ gameId: string; seconds: number }>("game-closed", (e) => h.closed(e.payload.gameId, e.payload.seconds)),
    listen<UnlockPayload>("achievement-unlocked", (e) => h.unlocked(e.payload)),
    listen<PackageProgress>("package-progress", (e) => h.progress(e.payload)),
    listen<{ gameId: string }>("game-update-requested", (e) => h.updateRequested(e.payload.gameId)),
  ]);
  return () => offs.forEach((off) => off());
}

/* ---------- atualização do próprio launcher ---------- */

export type LauncherUpdate = {
  version: string;
  /** baixa, instala e reinicia; `onProgress` recebe de 0 a 1 */
  install: (onProgress: (fraction: number) => void) => Promise<void>;
};

/** Versão nova do launcher no latest.json da última release (null = em dia ou fora do app). */
export async function checkLauncherUpdate(): Promise<LauncherUpdate | null> {
  if (!isTauri) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    install: async (onProgress) => {
      let total = 0;
      let received = 0;
      await update.downloadAndInstall((e) => {
        if (e.event === "Started") total = e.data.contentLength ?? 0;
        else if (e.event === "Progress") {
          received += e.data.chunkLength;
          if (total) onProgress(Math.min(1, received / total));
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
}

/* ---------- catálogo remoto ---------- */

/** Catálogo publicado no GitHub Pages do gg77-builds (scripts/publish-catalog.mjs). */
export const CATALOG_URL = "https://gg77studios.github.io/gg77-builds/catalog/catalog.json";

/** Caminho relativo ao catálogo vira endereço completo; "/..." (arquivo do launcher) e URLs ficam. */
function resolveAsset(value: string | undefined): string | undefined {
  if (!value || value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return new URL(value, CATALOG_URL).href;
}

function isGame(g: unknown): g is Game {
  const x = g as Partial<Game> | null;
  return (
    !!x &&
    typeof x.id === "string" &&
    /^[a-z0-9_-]+$/.test(x.id) &&
    typeof x.title === "string" &&
    typeof x.tint === "string" &&
    Array.isArray(x.achievements)
  );
}

/** Jogos do catálogo remoto, com as imagens em endereço completo; null se não deu para ler. */
export async function fetchRemoteCatalog(): Promise<Game[] | null> {
  try {
    const res = await fetch(CATALOG_URL, { cache: "no-cache" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const list = Array.isArray(data) ? data : (data as { games?: unknown })?.games;
    if (!Array.isArray(list)) return null;
    return list.filter(isGame).map((g) => ({
      ...g,
      url: typeof g.url === "string" ? g.url : "",
      cover: resolveAsset(g.cover),
      banner: resolveAsset(g.banner),
      icon: resolveAsset(g.icon),
      achievements: g.achievements.map((a) => ({ ...a, icon: resolveAsset(a.icon) })),
      iconRules: g.iconRules?.map((r) => ({ ...r, icon: resolveAsset(r.icon) ?? r.icon })),
      banners: g.banners?.map((b) => ({ ...b, image: resolveAsset(b.image) ?? b.image })),
      avatars: g.avatars?.map((a) => ({ ...a, image: resolveAsset(a.image) ?? a.image })),
    }));
  } catch {
    return null;
  }
}

/** Notificação do sistema, usada quando o launcher está atrás da janela do jogo. */
export async function notify(title: string, body: string) {
  if (!isTauri) return;
  const n = await import("@tauri-apps/plugin-notification");
  let ok = await n.isPermissionGranted();
  if (!ok) ok = (await n.requestPermission()) === "granted";
  if (ok) n.sendNotification({ title, body });
}

/** Lê uma imagem escolhida pelo usuário e reduz para caber no armazenamento local. */
export function imageToDataUrl(file: File, maxW: number, maxH: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("não foi possível ler a imagem"));
    };
    img.src = url;
  });
}
