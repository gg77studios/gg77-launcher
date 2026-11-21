import { ArrowClockwise } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { checkLauncherUpdate, type LauncherUpdate as Update } from "../lib/platform";

const RELEASES = "github.com/gg77studios/gg77-launcher/releases";

/** Aviso de versão nova do launcher na barra lateral; um clique baixa, instala e reinicia. */
export function LauncherUpdate() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // checa ao abrir e a cada 6 h (o launcher costuma ficar aberto)
    const run = () =>
      checkLauncherUpdate()
        .then((u) => {
          if (!cancelled && u) setUpdate(u);
        })
        .catch(() => {});
    void run();
    const timer = window.setInterval(run, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!update) return null;

  const install = async () => {
    setFailed(false);
    setProgress(0);
    try {
      await update.install(setProgress);
    } catch {
      // .deb/.rpm no Linux não se atualizam sozinhos: fica o caminho manual
      setProgress(null);
      setFailed(true);
    }
  };

  return (
    <div className="launcher-update glass" role="status" aria-live="polite">
      <strong>Launcher {update.version} disponível</strong>
      {failed ? (
        <span>Não deu para atualizar daqui. Baixe em {RELEASES}.</span>
      ) : progress === null ? (
        <button type="button" className="btn btn--accent" onClick={() => void install()}>
          <ArrowClockwise size={16} weight="bold" aria-hidden /> Reiniciar e atualizar
        </button>
      ) : (
        <span className="launcher-update-bar" aria-label={`Baixando ${Math.round(progress * 100)}%`}>
          <i style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </div>
  );
}
