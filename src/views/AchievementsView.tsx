import { useMemo, useState } from "react";
import { AchievementCard } from "../components/AchievementCard";
import { LAUNCHER_ID, unlockKey, XP_PER_LEVEL } from "../lib/catalog";
import { useStore } from "../lib/state";
import type { AchievementDef, Unlock } from "../lib/types";

type Row = { gameId: string; def: AchievementDef; unlock?: Unlock };

export function AchievementsView() {
  const { state, games, defsFor, gameTitle, xp, level, levelProgress } = useStore();
  const [filter, setFilter] = useState<string>("todas");
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);

  const sources = useMemo(() => [LAUNCHER_ID, ...games.map((g) => g.id)], [games]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const gid of sources) {
      const defs = defsFor(gid);
      for (const d of defs) out.push({ gameId: gid, def: d, unlock: state.unlocks[unlockKey(gid, d.id)] });
      // conquistas enviadas por jogos sem catálogo
      for (const u of Object.values(state.unlocks)) {
        if (u.gameId === gid && !defs.some((d) => d.id === u.id)) {
          out.push({ gameId: gid, def: { id: u.id, title: u.title ?? u.id, description: u.description ?? "", tier: "comum" }, unlock: u });
        }
      }
    }
    // liberadas primeiro (mais recentes no topo), depois bloqueadas
    return out.sort((a, b) => (b.unlock?.at ?? 0) - (a.unlock?.at ?? 0));
  }, [sources, defsFor, state.unlocks]);

  const visible = rows.filter((r) => (filter === "todas" || r.gameId === filter) && (!onlyUnlocked || r.unlock));
  const unlocked = rows.filter((r) => r.unlock).length;

  return (
    <div className="achievements">
      <header className="ach-head">
        <div>
          <h1>Conquistas</h1>
          <p>
            {unlocked} de {rows.length} liberadas
          </p>
        </div>
        <div className="ach-level">
          <span className="level-badge">{level}</span>
          <div>
            <strong>Nível {level}</strong>
            <span>
              {xp} XP, faltam {XP_PER_LEVEL - (xp % XP_PER_LEVEL)} para o próximo
            </span>
            <span className="xpbar xpbar--big" aria-hidden>
              <i style={{ width: `${levelProgress * 100}%` }} />
            </span>
          </div>
        </div>
      </header>

      <div className="chips" role="tablist" aria-label="Filtrar por jogo">
        {["todas", ...sources].map((id) => (
          <button key={id} type="button" role="tab" className="chip" aria-selected={filter === id} onClick={() => setFilter(id)}>
            {id === "todas" ? "Todas" : gameTitle(id)}
          </button>
        ))}
        <label className="toggle-inline">
          <input type="checkbox" checked={onlyUnlocked} onChange={(e) => setOnlyUnlocked(e.target.checked)} />
          Só liberadas
        </label>
      </div>

      <div className="ach-grid">
        {visible.map((r) => (
          <AchievementCard key={`${r.gameId}:${r.def.id}`} def={r.def} unlock={r.unlock} game={gameTitle(r.gameId)} />
        ))}
        {!visible.length && <p className="muted">Nada por aqui ainda.</p>}
      </div>
    </div>
  );
}
