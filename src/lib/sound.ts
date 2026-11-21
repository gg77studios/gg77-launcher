import type { Tier } from "./types";

/* Som de conquista sintetizado (sem arquivo de áudio): arpejo curto, mais longo nas raras. */

let ctx: AudioContext | null = null;

export function chime(tier: Tier) {
  try {
    ctx ??= new AudioContext();
    const notes = tier === "épica" ? [659.25, 783.99, 987.77, 1318.5] : tier === "rara" ? [659.25, 880, 1174.66] : [783.99, 1174.66];
    const t0 = ctx.currentTime + 0.02;
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = t0 + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    /* sem áudio disponível */
  }
}
