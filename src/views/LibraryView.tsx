import { ArrowClockwise, DownloadSimple, LockSimple, MagnifyingGlass, PencilSimple, Play, Plus, ShieldCheck, Stop, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { AchievementCard } from "../components/AchievementCard";
import { GameDialog } from "../components/GameDialog";
import { unlockKey } from "../lib/catalog";
import { fmtDuration, fmtRelative } from "../lib/format";
import { closeGame, launchInstalledGame } from "../lib/platform";
import { type PackageState, useStore } from "../lib/state";
import type { Game } from "../lib/types";

const SDK_SNIPPET = `// no jogo, quando o jogador conquistar algo:
window.GG77?.unlock("primeira-vitoria", {
  title: "Primeira vitória",
  description: "Venceu a primeira partida",
});`;

export function LibraryView() {
  const { state, games, running, dispatch, play, defsFor, banners, describe, packages, installPackage, uninstallPackage, verifyPackage } =
    useStore();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ mode: "add" } | { mode: "edit"; game: Game } | null>(null);
  const [error, setError] = useState("");

  const shelf = useMemo(
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
  const rewards = banners.filter((b) => b.gameId === game.id);

  const pkg = game.package ? packages[game.id] : undefined;

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    }
  };

  // jogo instalado com versão nova: o botão principal atualiza; "Jogar a x.y.z" abre a que já está
  const launchCurrent = () => run(() => launchInstalledGame(game.id, game.title));

  const onPrimary = () =>
    run(async () => {
      if (pkg?.updateAvailable && !isRunning) {
        if (await installPackage(game)) await launchInstalledGame(game.id, game.title);
        return;
      }
      await play(game);
    });

  const primary = primaryAction(game, pkg, isRunning);

  return (
    <div className="library">
      <section className="lib-hero" aria-labelledby="game-title">
        {isRunning && <span className="hero-kicker">Jogando agora</span>}
        <h1 id="game-title">{game.title}</h1>
        {game.tagline && <p>{game.tagline}</p>}
        <div className="hero-actions">
          {pkg?.busy === "install" ? (
            <div className="btn btn--accent btn--play install-progress" role="status" aria-live="polite">
              <DownloadSimple size={20} weight="bold" aria-hidden />
              {progressLabel(pkg)}
              <span className="install-bar" aria-hidden>
                <i style={{ width: `${progressPct(pkg) * 100}%` }} />
              </span>
            </div>
          ) : (
            <button type="button" className="btn btn--accent btn--play" onClick={onPrimary} disabled={!!pkg?.busy}>
              {primary.icon}
              {primary.label}
            </button>
          )}
          {pkg?.updateAvailable && !pkg.busy && (
            <button type="button" className="btn glass glass--btn" onClick={() => void launchCurrent()}>
              <Play size={16} weight="fill" aria-hidden /> Jogar a {pkg.installed}
            </button>
          )}
          {isRunning && (
            <button type="button" className="btn glass glass--btn" onClick={() => void closeGame(game.id)}>
              <Stop size={16} weight="fill" aria-hidden /> Fechar jogo
            </button>
          )}
          <button type="button" className="btn glass glass--btn" onClick={() => setDialog({ mode: "edit", game })}>
            <PencilSimple size={16} aria-hidden /> Editar
          </button>
          {game.custom && (
            <button type="button" className="btn glass glass--btn" onClick={() => dispatch({ type: "removeGame", id: game.id })}>
              <Trash size={16} aria-hidden /> Remover
            </button>
          )}
          {pkg?.installed && !pkg.busy && !isRunning && (
            <>
              <button type="button" className="btn glass glass--btn" onClick={() => void verifyPackage(game)}>
                <ShieldCheck size={16} aria-hidden /> Verificar arquivos
              </button>
              <button type="button" className="btn glass glass--btn" onClick={() => void uninstallPackage(game)}>
                <Trash size={16} aria-hidden /> Desinstalar
              </button>
            </>
          )}
        </div>
        {game.package && pkg && (
          <p className="pkg-line">
            {pkg.installed ? `Versão ${pkg.installed} instalada` : "Ainda não instalado"}
            {pkg.updateAvailable && pkg.latest && <b> · versão {pkg.latest} disponível</b>}
            {!pkg.installed && pkg.error && game.url && <span> · pacote indisponível, abrindo a versão web</span>}
          </p>
        )}
        {(error || pkg?.message) && (
          <p className={error ? "form-error" : "pkg-message"} role={error ? "alert" : "status"}>
            {error || pkg?.message}
          </p>
        )}

        <dl className="stat-pills">
          <div className="glass">
            <dt>Tempo de jogo</dt>
            <dd>{fmtDuration(stats?.seconds ?? 0)}</dd>
          </div>
          <div className="glass">
            <dt>Última vez</dt>
            <dd>{fmtRelative(stats?.lastPlayed)}</dd>
          </div>
          <div className="glass">
            <dt>Sessões</dt>
            <dd>{stats?.sessions ?? 0}</dd>
          </div>
          <div className="glass">
            <dt>Conquistas</dt>
            <dd>
              {unlockedCount}/{total}
              <span className="mini-bar" aria-hidden>
                <i style={{ width: total ? `${(unlockedCount / total) * 100}%` : 0 }} />
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="dock glass" aria-label="Seus jogos">
        <div className="dock-head">
          <h2>Biblioteca</h2>
          <label className="search glass glass--field">
            <MagnifyingGlass size={15} aria-hidden />
            <input placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar jogo" />
          </label>
        </div>
        <ul className="shelf">
          {shelf.map((g) => {
            const st = state.stats[g.id];
            const current = g.id === game.id;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="capsule"
                  aria-current={current || undefined}
                  onClick={() => dispatch({ type: "select", id: g.id })}
                  title={g.title}
                >
                  <span
                    className="capsule-art"
                    style={{ background: g.tint, backgroundImage: g.cover || g.banner ? `url(${g.cover ?? g.banner})` : undefined }}
                  >
                    {!g.cover && !g.banner && g.title[0]}
                    {g.icon && (g.cover || g.banner) && <img className="capsule-icon" src={g.icon} alt="" />}
                    {running.has(g.id) && <i className="live-dot" aria-label="em execução" />}
                  </span>
                  <span className="capsule-title">{g.title}</span>
                  <span className="capsule-sub" data-update={packages[g.id]?.updateAvailable || undefined}>
                    {running.has(g.id)
                      ? "jogando"
                      : packages[g.id]?.updateAvailable
                        ? "atualização disponível"
                        : g.package && packages[g.id] && !packages[g.id]?.installed && !packages[g.id]?.error
                          ? "não instalado"
                          : st?.seconds
                            ? fmtDuration(st.seconds)
                            : "nunca jogado"}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" className="capsule capsule--add" onClick={() => setDialog({ mode: "add" })}>
              <span className="capsule-art">
                <Plus size={26} weight="bold" aria-hidden />
              </span>
              <span className="capsule-title">Adicionar</span>
              <span className="capsule-sub">por endereço</span>
            </button>
          </li>
        </ul>
        {!shelf.length && <p className="muted dock-empty">Nenhum jogo com esse nome.</p>}
      </section>

      <div className="lib-lower">
        <section className="panel glass">
          <div className="panel-head">
            <h2>Conquistas</h2>
            <span className="muted">
              {unlockedCount} de {total}
            </span>
          </div>
          {total ? (
            <div className="ach-list">
              {extra.map((u) => (
                <AchievementCard key={u.id} def={{ id: u.id, ...describe(u) }} unlock={u} pixel={game.pixelArt} compact />
              ))}
              {defs.map((d) => (
                <AchievementCard key={d.id} def={d} unlock={state.unlocks[unlockKey(game.id, d.id)]} pixel={game.pixelArt} compact />
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
        </section>

        {rewards.length > 0 && (
          <section className="panel glass rewards">
            <div className="panel-head">
              <h2>Banners do jogo</h2>
              <span className="muted">
                {rewards.filter((b) => b.unlocked).length} de {rewards.length}
              </span>
            </div>
            <ul>
              {rewards.map((b) => (
                <li key={b.ref} data-locked={!b.unlocked || undefined} title={b.unlocked ? b.def.title : `Libere com: ${b.requirement}`}>
                  <span className="reward-img" style={b.def.image ? { backgroundImage: `url(${b.def.image})` } : undefined}>
                    {!b.unlocked && <LockSimple size={14} weight="bold" aria-hidden />}
                  </span>
                  <span className="reward-text">
                    <strong>{b.def.title}</strong>
                    <span>{b.unlocked ? "liberado" : b.requirement}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

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

// atualização por patch costuma ter poucos KB: abaixo de 1 MB mostra em KB
const fmtMb = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1048576) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("pt-BR")} KB`;
  return `${(bytes / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
};

function primaryAction(game: Game, pkg: PackageState | undefined, isRunning: boolean) {
  const play = { icon: <Play size={20} weight="fill" aria-hidden />, label: isRunning ? "Ir para o jogo" : "Jogar" };
  if (!game.package || isRunning || !pkg) return play;
  if (pkg.updateAvailable) return { icon: <ArrowClockwise size={20} weight="bold" aria-hidden />, label: `Atualizar (${fmtMb(pkg.size)})` };
  if (!pkg.installed && !pkg.error) {
    return { icon: <DownloadSimple size={20} weight="bold" aria-hidden />, label: `Instalar${pkg.size ? ` (${fmtMb(pkg.size)})` : ""}` };
  }
  return play;
}

function progressPct(pkg: PackageState) {
  const p = pkg.progress;
  if (!p || !p.total) return 0;
  return Math.min(1, p.received / p.total);
}

function progressLabel(pkg: PackageState) {
  const p = pkg.progress;
  if (!p) return "Preparando…";
  if (p.phase === "extract") return "Instalando…";
  if (p.phase === "done") return "Pronto";
  return `Baixando ${Math.round(progressPct(pkg) * 100)}%`;
}
