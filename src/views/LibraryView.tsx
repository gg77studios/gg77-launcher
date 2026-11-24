import { ArrowClockwise, Clock, DotsThree, DownloadSimple, MagnifyingGlass, PencilSimple, Play, Plus, ShieldCheck, Stop, Trash, Trophy } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AchievementCard } from "../components/AchievementCard";
import { GameDialog } from "../components/GameDialog";
import { unlockKey } from "../lib/catalog";
import { fmtDuration, fmtRelative } from "../lib/format";
import { useNav } from "../lib/nav";
import { closeGame, launchInstalledGame } from "../lib/platform";
import { type PackageState, useStore } from "../lib/state";
import type { Game } from "../lib/types";

const SDK_SNIPPET = `// no jogo, quando o jogador conquistar algo:
window.GG77?.unlock("primeira-vitoria", {
  title: "Primeira vitória",
  description: "Venceu a primeira partida",
});`;

export function LibraryView() {
  const { state, games, running, dispatch, play, defsFor, describe, packages, installPackage, uninstallPackage, verifyPackage } = useStore();
  const { go } = useNav();
  const lib = state.settings.library;
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ mode: "add" } | { mode: "edit"; game: Game } | null>(null);
  const [error, setError] = useState("");

  const shelf = useMemo(() => {
    const list = games.filter((g) => g.title.toLowerCase().includes(query.trim().toLowerCase()));
    const st = (id: string) => state.stats[id];
    if (lib.sort === "nome") list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    else if (lib.sort === "recente") list.sort((a, b) => (st(b.id)?.lastPlayed ?? 0) - (st(a.id)?.lastPlayed ?? 0));
    else if (lib.sort === "tempo") list.sort((a, b) => (st(b.id)?.seconds ?? 0) - (st(a.id)?.seconds ?? 0));
    return list;
  }, [games, query, lib.sort, state.stats]);
  const game = games.find((g) => g.id === state.selectedGame) ?? games[0];
  const stats = state.stats[game.id];
  const defs = defsFor(game.id);
  // conquistas que o jogo liberou mas não estão no catálogo (jogos adicionados pelo usuário)
  const extra = Object.values(state.unlocks).filter((u) => u.gameId === game.id && !defs.some((d) => d.id === u.id));
  const unlockedCount = defs.filter((d) => state.unlocks[unlockKey(game.id, d.id)]).length + extra.length;
  const total = defs.length + extra.length;
  const isRunning = running.has(game.id);
  // resumo: as últimas liberadas e, depois, as próximas que ainda faltam (secretas ficam de fora)
  const highlights = [
    ...[...extra, ...defs.map((d) => state.unlocks[unlockKey(game.id, d.id)]).filter((u): u is NonNullable<typeof u> => !!u)]
      .sort((a, b) => b.at - a.at)
      .map((u) => ({ def: defs.find((d) => d.id === u.id) ?? { id: u.id, ...describe(u) }, unlock: u })),
    ...defs.filter((d) => !d.hidden && !state.unlocks[unlockKey(game.id, d.id)]).map((d) => ({ def: d, unlock: undefined })),
  ].slice(0, 6);

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
    <div className="library" data-layout={lib.layout} data-size={lib.size}>
      <section className="lib-hero" aria-labelledby="game-title">
        {isRunning && <span className="hero-kicker">Jogando agora</span>}
        <h1 id="game-title">{game.title}</h1>
        {game.tagline && <p>{game.tagline}</p>}
        <p className="hero-meta">
          <span>
            <Clock size={15} aria-hidden /> {stats?.seconds ? fmtDuration(stats.seconds) : "nunca jogado"}
          </span>
          {stats?.lastPlayed && <span>última vez {fmtRelative(stats.lastPlayed)}</span>}
          {total > 0 && (
            <span>
              <Trophy size={15} aria-hidden /> {unlockedCount} de {total}
            </span>
          )}
          {game.package && pkg && (
            <span className="hero-meta-pkg" data-update={pkg.updateAvailable || undefined}>
              {pkg.updateAvailable && pkg.latest
                ? `versão ${pkg.latest} disponível`
                : pkg.installed
                  ? `v${pkg.installed}`
                  : pkg.error && game.url
                    ? "pacote indisponível, abre a versão web"
                    : "não instalado"}
            </span>
          )}
        </p>
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
          {isRunning && (
            <button type="button" className="btn glass glass--btn" onClick={() => void closeGame(game.id)}>
              <Stop size={16} weight="fill" aria-hidden /> Fechar jogo
            </button>
          )}
          <MoreMenu
            items={[
              pkg?.updateAvailable && !pkg.busy && { label: `Jogar a ${pkg.installed} (sem atualizar)`, icon: <Play size={16} />, run: () => void launchCurrent() },
              { label: "Editar nome e imagens", icon: <PencilSimple size={16} />, run: () => setDialog({ mode: "edit", game }) },
              pkg?.installed && !pkg.busy && !isRunning && { label: "Verificar arquivos", icon: <ShieldCheck size={16} />, run: () => void verifyPackage(game) },
              pkg?.installed && !pkg.busy && !isRunning && { label: "Desinstalar", icon: <Trash size={16} />, run: () => void uninstallPackage(game), danger: true },
              game.custom && { label: "Remover da biblioteca", icon: <Trash size={16} />, run: () => dispatch({ type: "removeGame", id: game.id }), danger: true },
            ]}
          />
        </div>
        {(error || pkg?.message) && (
          <p className={error ? "form-error" : "pkg-message"} role={error ? "alert" : "status"}>
            {error || pkg?.message}
          </p>
        )}
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
                    style={{
                      background: g.tint,
                      // na lista a miniatura é quadrada: o ícone do jogo cabe melhor que a capa cortada
                      backgroundImage:
                        lib.layout === "lista" && g.icon ? `url(${g.icon})` : g.cover || g.banner ? `url(${g.cover ?? g.banner})` : undefined,
                    }}
                  >
                    {!g.cover && !g.banner && g.title[0]}
                    {g.icon && (g.cover || g.banner) && <img className="capsule-icon" src={g.icon} alt="" />}
                    {running.has(g.id) && <i className="live-dot" aria-label="em execução" />}
                  </span>
                  <span className="capsule-title">{g.title}</span>
                  {lib.layout === "lista" && <span className="capsule-last">{st?.lastPlayed ? `jogado ${fmtRelative(st.lastPlayed)}` : ""}</span>}
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

      <section className="panel glass lib-ach" aria-labelledby="lib-ach-title">
        <div className="panel-head">
          <h2 id="lib-ach-title">Conquistas</h2>
          {total > 0 && (
            <button type="button" className="link-btn" onClick={() => go("conquistas", { gameId: game.id })}>
              Ver todas
            </button>
          )}
        </div>
        {total ? (
          <>
            <div className="lib-ach-progress">
              <span className="mini-bar" aria-hidden>
                <i style={{ width: `${(unlockedCount / total) * 100}%` }} />
              </span>
              <span className="muted">
                {unlockedCount} de {total}
              </span>
            </div>
            <div className="ach-strip">
              {highlights.map((h) => (
                <AchievementCard key={h.def.id} def={h.def} unlock={h.unlock} pixel={game.pixelArt} compact />
              ))}
            </div>
          </>
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

type MenuItem = { label: string; icon: React.ReactNode; run: () => void; danger?: boolean };

/** Ações que não são o "Jogar" ficam num menu, para o topo da biblioteca não virar uma fileira de botões. */
function MoreMenu({ items }: { items: Array<MenuItem | false | undefined | null | ""> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = items.filter((i): i is MenuItem => !!i);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!list.length) return null;
  return (
    <div className="more" ref={ref}>
      <button
        type="button"
        className="btn glass glass--btn more-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais opções"
        title="Mais opções"
        onClick={() => setOpen((v) => !v)}
      >
        <DotsThree size={20} weight="bold" aria-hidden />
      </button>
      {open && (
        <div className="more-menu" role="menu">
          {list.map((i) => (
            <button
              key={i.label}
              type="button"
              role="menuitem"
              data-danger={i.danger || undefined}
              onClick={() => {
                setOpen(false);
                i.run();
              }}
            >
              {i.icon}
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
