import { useReducedMotion } from "motion/react";
import { useStore } from "./state";

/**
 * Se as animações de perfil (molduras, efeitos, nome) devem rodar aqui.
 * `live` marca o próprio perfil em destaque; "meu-perfil" só anima esses.
 */
export function useAnimate(live = false) {
  const reduce = useReducedMotion();
  const { state } = useStore();
  const m = state.settings.motion;
  if (reduce || m === "nada") return false;
  return m === "tudo" || live;
}
