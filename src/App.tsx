import { PaintBrush, SquaresFour, Trophy, UserCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Avatar } from "./components/Avatar";
import { Toasts } from "./components/Toasts";
import { inkOn } from "./lib/format";
import { useStore } from "./lib/state";
import { AchievementsView } from "./views/AchievementsView";
import { CustomizeView } from "./views/CustomizeView";
import { LibraryView } from "./views/LibraryView";
import { ProfileView } from "./views/ProfileView";

type View = "biblioteca" | "conquistas" | "perfil" | "personalizar";

const NAV: Array<{ id: View; label: string; icon: typeof Trophy }> = [
  { id: "biblioteca", label: "Biblioteca", icon: SquaresFour },
  { id: "conquistas", label: "Conquistas", icon: Trophy },
  { id: "perfil", label: "Perfil", icon: UserCircle },
  { id: "personalizar", label: "Personalizar", icon: PaintBrush },
];

export function App() {
  const { state, ready, games, level, levelProgress, xp, bannerImage, titleText } = useStore();
  const [view, setView] = useState<View>("biblioteca");
  const reduce = useReducedMotion();
  const { settings, profile } = state;
  const selected = games.find((g) => g.id === state.selectedGame) ?? games[0];

  // papel de parede: a arte do jogo selecionado; no perfil, o banner do perfil
  const wallpaper = view === "perfil" ? (bannerImage ?? (settings.ambient ? selected?.banner : undefined)) : settings.ambient ? selected?.banner : undefined;

  const themeVars = {
    "--accent": settings.accent,
    "--on-accent": inkOn(settings.accent),
  } as React.CSSProperties;

  return (
    <div className="app" data-theme={settings.theme} data-glass={settings.glass} style={themeVars}>
      <div className="wall" aria-hidden>
        <AnimatePresence initial={false}>
          <motion.div
            key={wallpaper ?? "mesh"}
            className={wallpaper ? "wall-img" : "wall-img wall-img--mesh"}
            style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}
            initial={reduce ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </AnimatePresence>
        <div className="wall-shade" />
      </div>

      <aside className="side glass">
        <div className="logo">
          <img className="logo-icon" src="/icon.png" alt="" width={30} height={30} />
          <span className="logo-mark">GG77</span>
        </div>
        <nav aria-label="Seções">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="nav-item" aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>
              {view === id && !reduce && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              {view === id && reduce && <span className="nav-pill" />}
              <Icon size={20} weight={view === id ? "fill" : "regular"} aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="me" onClick={() => setView("perfil")} title="Abrir perfil">
          <Avatar profile={profile} size={40} />
          <span className="me-text">
            <strong>{profile.nickname || "Jogador"}</strong>
            {titleText && <span className="me-title">{titleText}</span>}
            <span>
              Nível {level} <em>{xp} XP</em>
            </span>
            <span className="xpbar" aria-hidden>
              <i style={{ width: `${levelProgress * 100}%` }} />
            </span>
          </span>
        </button>
      </aside>

      <main className="main">
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
              {view === "perfil" && <ProfileView />}
              {view === "personalizar" && <CustomizeView />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <Toasts />
    </div>
  );
}
