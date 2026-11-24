import { Coins, SquaresFour, Storefront, Trophy, UserCircle, UsersThree } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./components/Avatar";
import { LauncherUpdate } from "./components/LauncherUpdate";
import { Nick } from "./components/ProfileCard";
import { SignInGate } from "./components/SignInGate";
import { Toasts } from "./components/Toasts";
import { useAccount } from "./lib/account";
import { inkOn } from "./lib/format";
import { NavCtx, type ShopIntent, type View } from "./lib/nav";
import { itemValue, LIGHT_THEMES } from "./lib/shop";
import { useStore } from "./lib/state";
import { AchievementsView } from "./views/AchievementsView";
import { FriendsView } from "./views/FriendsView";
import { LibraryView } from "./views/LibraryView";
import { ProfileView } from "./views/ProfileView";
import { ShopView } from "./views/ShopView";

const NAV: Array<{ id: View; label: string; icon: typeof Trophy }> = [
  { id: "biblioteca", label: "Biblioteca", icon: SquaresFour },
  { id: "conquistas", label: "Conquistas", icon: Trophy },
  { id: "amigos", label: "Amigos", icon: UsersThree },
  { id: "perfil", label: "Perfil", icon: UserCircle },
  { id: "loja", label: "Loja", icon: Storefront },
];

const FONT_FAMILY: Record<string, string> = {
  figtree: '"Figtree Variable", system-ui, sans-serif',
  nunito: '"Nunito Variable", system-ui, sans-serif',
  "space-grotesk": '"Space Grotesk Variable", system-ui, sans-serif',
  // pixel só nos títulos (--display, em loja.css): no texto corrido fica ilegível
  pixelify: '"Figtree Variable", system-ui, sans-serif',
};

export function App() {
  const { state, ready, games, level, levelProgress, xp, bannerImage, titleText, item, wallet } = useStore();
  const [view, setView] = useState<View>("biblioteca");
  const [shopIntent, setShopIntent] = useState<ShopIntent>();
  const reduce = useReducedMotion();
  const account = useAccount();
  const { settings, profile } = state;
  const selected = games.find((g) => g.id === state.selectedGame) ?? games[0];
  const compact = settings.sidebar.mode === "compacta";

  const go = useCallback((v: View, intent?: Omit<ShopIntent, "at">) => {
    if (intent) setShopIntent({ ...intent, at: Date.now() });
    setView(v);
  }, []);
  const nav = useMemo(() => ({ view, go, shopIntent }), [view, go, shopIntent]);

  // cada tela abre do topo (a área principal é um só rolador para todas)
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [view]);

  // papel de parede: a arte do jogo selecionado (ou o fundo escolhido); no perfil, o banner do perfil
  const chosen = item(settings.wallpaper);
  const backdrop = settings.ambient
    ? { image: selected?.banner }
    : chosen?.kind === "banner"
      ? { image: chosen.image }
      : { pattern: itemValue(chosen?.id ?? "wallpaper:degrade") };
  const wall = view === "perfil" && bannerImage ? { image: bannerImage } : backdrop;
  const wallKey = wall.image ?? `p:${wall.pattern ?? "degrade"}`;

  const themeVars = {
    "--accent": settings.accent,
    "--on-accent": inkOn(settings.accent),
    "--body": FONT_FAMILY[settings.font] ?? FONT_FAMILY.figtree,
  } as React.CSSProperties;

  return (
    <NavCtx.Provider value={nav}>
      <div
        className="app"
        data-theme={settings.theme}
        data-light={LIGHT_THEMES.has(settings.theme) || undefined}
        data-glass={settings.glass}
        data-sidebar={settings.sidebar.mode}
        data-side={settings.sidebar.side}
        data-font={settings.font}
        data-density={settings.density}
        data-corners={settings.corners}
        data-motion={settings.motion}
        style={themeVars}
      >
        <div className="wall" aria-hidden>
          <AnimatePresence initial={false}>
            <motion.div
              key={wallKey}
              className={wall.image ? "wall-img" : `wall-img wall-img--${wall.pattern === "degrade" ? "mesh" : wall.pattern}`}
              style={wall.image ? { backgroundImage: `url(${wall.image})` } : undefined}
              initial={reduce ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </AnimatePresence>
          <div className="wall-shade" />
        </div>

        {!account.restored ? (
          <div className="splash" aria-busy="true" />
        ) : !account.user ? (
          <SignInGate />
        ) : (
          <>
            <aside className="side glass">
              <div className="logo">
                <img className="logo-icon" src="/icon.png" alt="" width={30} height={30} />
                <span className="logo-mark">GG77</span>
              </div>
              <nav aria-label="Seções">
                {NAV.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="nav-item"
                    aria-current={view === id ? "page" : undefined}
                    onClick={() => go(id)}
                    title={compact ? label : undefined}
                    aria-label={compact ? label : undefined}
                  >
                    {view === id && !reduce && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    {view === id && reduce && <span className="nav-pill" />}
                    <Icon size={20} weight={view === id ? "fill" : "regular"} aria-hidden />
                    <span className="nav-label">{label}</span>
                  </button>
                ))}
              </nav>
              <LauncherUpdate />
              <button type="button" className="me" onClick={() => go("perfil")} title={compact ? `${profile.nickname || "Jogador"}, nível ${level}` : "Abrir perfil"}>
                <Avatar profile={profile} size={40} />
                <span className="me-text">
                  <Nick style={profile.nameStyle} as="strong">
                    {profile.nickname || "Jogador"}
                  </Nick>
                  {titleText && <span className="me-title">{titleText}</span>}
                  <span>
                    Nível {level} <em>{xp} XP</em>
                  </span>
                  <span className="xpbar" aria-hidden>
                    <i style={{ width: `${levelProgress * 100}%` }} />
                  </span>
                  <span className="me-coins">
                    <Coins size={13} weight="fill" aria-hidden /> {wallet.balance.toLocaleString("pt-BR")} fichas
                  </span>
                </span>
              </button>
            </aside>

            <main className="main" ref={mainRef}>
              {!ready ? (
                <div className="splash" aria-busy="true" />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    className="view"
                    initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {view === "biblioteca" && <LibraryView />}
                    {view === "conquistas" && <AchievementsView />}
                    {view === "amigos" && <FriendsView />}
                    {view === "perfil" && <ProfileView />}
                    {view === "loja" && <ShopView />}
                  </motion.div>
                </AnimatePresence>
              )}
            </main>
          </>
        )}

        <Toasts />
      </div>
    </NavCtx.Provider>
  );
}
