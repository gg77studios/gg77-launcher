export function fmtDuration(seconds: number) {
  if (seconds < 60) return seconds > 0 ? "menos de 1 min" : "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function fmtHours(seconds: number) {
  const h = seconds / 3600;
  return h < 10 ? h.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : Math.round(h).toLocaleString("pt-BR");
}

export function fmtRelative(t?: number) {
  if (!t) return "nunca";
  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  const days = Math.floor((d0.getTime() - new Date(t).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Date(t).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

/** Cor de texto legível sobre uma cor de fundo (luminância relativa). */
export function inkOn(hex: string) {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.35 ? "#14161b" : "#ffffff";
}
