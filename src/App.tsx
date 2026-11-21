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
  const { state, ready, games, level, levelProgress, xp } = useStore();
  const [view, setView] = useState<View>("biblioteca");
  const reduce = useReducedMotion();
  const { settings, profile } = state;
  const selected = games.find((g) => g.id === state.selectedGame) ?? games[0];

  const themeVars = {
    "--accent": settings.accent,
    "--on-accent": inkOn(settings.accent),
  } as React.CSSProperties;

  return (
    <div className="app" data-theme={settings.theme} style={themeVars}>
      {settings.ambient && selected?.banner && (
        <div className="ambient" aria-hidden style={{ backgroundImage: `url(${selected.banner})` }} />
      )}

      <aside className="side">
        <div className="logo">
          <span className="logo-mark">GG77</span>
          <span className="logo-sub">launcher</span>
        </div>
        <nav aria-label="Seções">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="nav-item" aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>
              <Icon size={20} weight={view === id ? "fill" : "regular"} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="me" onClick={() => setView("perfil")} title="Abrir perfil">
          <Avatar profile={profile} size={40} />
          <span className="me-text">
            <strong>{profile.nickname || "Jogador"}</strong>
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
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
