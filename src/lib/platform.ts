/* Ponte com o Tauri. Fora do app (npm run dev no navegador) tudo cai para
   localStorage e window.open, para dar para desenvolver a interface sem compilar o Rust. */

import type { UnlockPayload } from "./types";

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
