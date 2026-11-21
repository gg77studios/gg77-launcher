import { MagnifyingGlass, PencilSimple, Play, Plus, Stop, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { AchievementCard } from "../components/AchievementCard";
import { GameDialog } from "../components/GameDialog";
import { unlockKey } from "../lib/catalog";
import { fmtDuration, fmtRelative } from "../lib/format";
import { closeGame } from "../lib/platform";
import { useStore } from "../lib/state";
import type { Game } from "../lib/types";

const SDK_SNIPPET = `// no jogo, quando o jogador conquistar algo:
window.GG77?.unlock("primeira-vitoria", {
  title: "Primeira vitória",
  description: "Venceu a primeira partida",
});`;

export function LibraryView() {
  const { state, games, running, dispatch, play, defsFor } = useStore();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ mode: "add" } | { mode: "edit"; game: Game } | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(
    () => games.filter((g) => g.title.toLowerCase().includes(query.trim().toLowerCase())),
    [games, query],
  );
  const game = games.find((g) => g.id === state.selectedGame) ?? games[0];
  const stats = state.stats[game.id];
  const defs = defsFor(game.id);
  // conquistas que o jogo liberou mas não estão no catálogo (jogos adicionados pelo usuário)
  const extra = Object.values(state.unlocks).filter((u) => u.gameId === game.id && !defs.some((d) => d.id === u.id));
  const unlockedCount = defs.filter((d) => state.unlocks[unlockKey(game.id, d.id)]).length + extra.length;
  const total = defs.length + extra.length;
  const isRunning = running.has(game.id);

  const onPlay = async () => {
    setError("");
    try {
      await play(game);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="library">
      <section className="lib-list" aria-label="Seus jogos">
        <label className="search">
          <MagnifyingGlass size={16} aria-hidden />
          <input className="input" placeholder="Buscar na biblioteca" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar jogo" />
        </label>
        <ul>
          {filtered.map((g) => {
            const st = state.stats[g.id];
            return (
              <li key={g.id}>
                <button type="button" className="lib-item" aria-current={g.id === game.id || undefined} onClick={() => dispatch({ type: "select", id: g.id })}>
                  <span className="lib-icon" style={{ background: g.tint, backgroundImage: g.icon || g.cover ? `url(${g.icon ?? g.cover})` : undefined }}>
                    {!g.icon && !g.cover && g.title[0]}
                  </span>
                  <span className="lib-item-text">
                    <strong>{g.title}</strong>
                    <span>{running.has(g.id) ? "Jogando agora" : st?.seconds ? fmtDuration(st.seconds) : "Nunca jogado"}</span>
                  </span>
                  {running.has(g.id) && <i className="live-dot" aria-label="em execução" />}
                </button>
              </li>
            );
          })}
          {!filtered.length && <li className="lib-empty">Nenhum jogo com esse nome.</li>}
        </ul>
        <button type="button" className="lib-add" onClick={() => setDialog({ mode: "add" })}>
          <Plus size={16} weight="bold" aria-hidden /> Adicionar jogo
        </button>
      </section>

      <section className="lib-detail" aria-labelledby="game-title">
        <div className="hero" style={{ background: game.tint, backgroundImage: game.banner ? `url(${game.banner})` : undefined }}>
          <div className="hero-shade" />
          <div className="hero-body">
            <h1 id="game-title">{game.title}</h1>
            {game.tagline && <p>{game.tagline}</p>}
            <div className="hero-actions">
              <button type="button" className="btn btn--accent btn--play" onClick={onPlay}>
                <Play size={20} weight="fill" aria-hidden />
                {isRunning ? "Ir para o jogo" : "Jogar"}
              </button>
              {isRunning && (
                <button type="button" className="btn btn--glass" onClick={() => void closeGame(game.id)}>
                  <Stop size={16} weight="fill" aria-hidden /> Fechar jogo
                </button>
              )}
              <button type="button" className="btn btn--glass" onClick={() => setDialog({ mode: "edit", game })}>
                <PencilSimple size={16} aria-hidden /> Editar
              </button>
              {game.custom && (
                <button type="button" className="btn btn--glass" onClick={() => dispatch({ type: "removeGame", id: game.id })}>
                  <Trash size={16} aria-hidden /> Remover
                </button>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <dl className="game-stats">
          <div>
            <dt>Tempo de jogo</dt>
            <dd>{fmtDuration(stats?.seconds ?? 0)}</dd>
          </div>
          <div>
            <dt>Última vez</dt>
            <dd>{fmtRelative(stats?.lastPlayed)}</dd>
          </div>
          <div>
            <dt>Sessões</dt>
            <dd>{stats?.sessions ?? 0}</dd>
          </div>
          <div>
            <dt>Conquistas</dt>
            <dd>
              {unlockedCount}/{total}
              <span className="mini-bar" aria-hidden>
                <i style={{ width: total ? `${(unlockedCount / total) * 100}%` : 0 }} />
              </span>
            </dd>
          </div>
        </dl>

        <div className="game-lower">
          <div className="panel">
            <h2>Conquistas</h2>
            {total ? (
              <div className="ach-list">
                {extra.map((u) => (
                  <AchievementCard key={u.id} def={{ id: u.id, title: u.title ?? u.id, description: u.description ?? "", tier: "comum" }} unlock={u} compact />
                ))}
                {defs.map((d) => (
                  <AchievementCard key={d.id} def={d} unlock={state.unlocks[unlockKey(game.id, d.id)]} compact />
                ))}
              </div>
            ) : (
              <div className="sdk">
                <p>Este jogo ainda não envia conquistas. Para integrar, o jogo chama o SDK que o launcher injeta na janela:</p>
                <pre>
                  <code>{SDK_SNIPPET}</code>
                </pre>
                <p className="muted">Fora do launcher, window.GG77 não existe e a chamada é ignorada.</p>
              </div>
            )}
          </div>
          {game.cover && (
            <figure className="cover-card">
              <img src={game.cover} alt={`Capa de ${game.title}`} />
            </figure>
          )}
        </div>
      </section>

      {dialog && (
        <GameDialog
          game={dialog.mode === "edit" ? dialog.game : undefined}
          existingIds={games.map((g) => g.id)}
          onClose={() => setDialog(null)}
          onSave={(g) => {
            if (dialog.mode === "add") dispatch({ type: "addGame", game: g });
            else dispatch({ type: "updateGame", id: g.id, patch: { title: g.title, cover: g.cover, banner: g.banner, url: g.url } });
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
