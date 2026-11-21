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

type Handlers = {
  started: (gameId: string) => void;
  closed: (gameId: string, seconds: number) => void;
  unlocked: (p: UnlockPayload) => void;
};

/** Escuta os eventos que o Rust manda para a janela principal. */
export async function listenGameEvents(h: Handlers): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const offs = await Promise.all([
    listen<string>("game-started", (e) => h.started(e.payload)),
    listen<{ gameId: string; seconds: number }>("game-closed", (e) => h.closed(e.payload.gameId, e.payload.seconds)),
    listen<UnlockPayload>("achievement-unlocked", (e) => h.unlocked(e.payload)),
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
