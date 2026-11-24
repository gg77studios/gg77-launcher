import { createContext, useContext } from "react";
import type { ItemKind } from "./types";

export type View = "biblioteca" | "conquistas" | "amigos" | "perfil" | "loja";

/** Abas da loja: os efeitos de avatar e de banner dividem a mesma aba. */
export type ShopTab = "avatar" | "banner" | "frame" | "fx" | "nameStyle" | "theme" | "wallpaper";

export const tabOf = (kind: ItemKind): ShopTab => (kind === "avatarFx" || kind === "bannerFx" ? "fx" : kind);

/** Pedido para abrir a loja numa aba (e num jogo), vindo de outra tela. */
export type ShopIntent = { tab?: ShopTab; gameId?: string; at: number };

type Nav = {
  view: View;
  go: (view: View, intent?: Omit<ShopIntent, "at">) => void;
  shopIntent?: ShopIntent;
};

export const NavCtx = createContext<Nav>({ view: "biblioteca", go: () => {} });

export const useNav = () => useContext(NavCtx);
