import { Trophy } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { useStore } from "../lib/state";

/** Aviso de conquista no canto inferior direito, um de cada vez em fila. */
export function Toasts() {
  const { toasts, dismissToast } = useStore();
  const reduce = useReducedMotion();
  const current = toasts.slice(0, 3);

  useEffect(() => {
    if (!toasts.length) return;
    const t = window.setTimeout(() => dismissToast(toasts[0].key), 5200);
    return () => window.clearTimeout(t);
  }, [toasts, dismissToast]);

  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {current.map((t) => (
          <motion.button
            type="button"
            key={t.key}
            className="toast"
            data-tier={t.tier}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, x: 60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={() => dismissToast(t.key)}
            title="Fechar"
          >
            <span className="toast-medal" data-art={t.icon ? true : undefined} data-pixel={t.pixel || undefined} aria-hidden>
              {t.icon ? <img src={t.icon} alt="" /> : <Trophy size={22} weight="fill" />}
            </span>
            <span className="toast-text">
              <small>Conquista desbloqueada</small>
              <strong>{t.title}</strong>
              <span>
                {t.game}, +{t.xp} XP
              </span>
              <em className="toast-reward">+{t.coins} fichas para a loja</em>
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
