import { useId } from "react";

/*
 * Molduras do avatar em SVG. O desenho usa um espaço de 0 a 100 onde o avatar é o círculo de
 * centro (50, 50) e raio 50; o aro ocupa do raio 42 ao 50 (o rosto encolhe 8% quando há moldura)
 * e os ornamentos podem sair até 15 unidades para fora. A animação fica no CSS (classes fr-*),
 * para que [data-still] e prefers-reduced-motion parem tudo.
 */

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (r: number, deg: number) => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))] as const;
const steps = (n: number, from = 0, span = 360) => Array.from({ length: n }, (_, i) => from + (i * span) / n);

/** Molduras quadradas: o rosto do avatar vira um quadrado de cantos curtos. */
export const SQUARE_FRAMES = new Set(["pixel", "pixel-coracao", "bloco-grama", "minerio", "portal"]);

const PIXEL_OUTER = "M8 0H92V4H96V8H100V92H96V96H92V100H8V96H4V92H0V8H4V4H8Z";
const PIXEL_INNER = "M12 8H88V12H92V88H88V92H12V88H8V12H12Z";
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
const RUNES = [
  "M0 -3V3M0 -1L2 -3",
  "M-1 -3V3M-1 -3L2 0L-1 1",
  "M0 -3V3M-2 -1L2 1",
  "M-2 3L0 -3L2 3",
  "M0 -3V3M0 0L2 -2M0 0L2 2",
  "M-2 -3L2 3M2 -3L-2 3",
  "M0 -3V3M0 -3L2 -1L0 1",
  "M-2 -3V3M2 -3V3M-2 0H2",
];
const SPARK = "M0 -3L.8 -.8L3 0L.8 .8L0 3L-.8 .8L-3 0L-.8 -.8Z";

/** Pseudoaleatório fixo (mesmo desenho sempre). */
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Casas de 4x4 que caem dentro do aro quadrado (borda de 8 unidades). */
const RING_CELLS = (() => {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < 100; y += 4) for (let x = 0; x < 100; x += 4) if (x < 8 || x >= 92 || y < 8 || y >= 92) out.push([x, y]);
  return out;
})();

/** Aro quadrado em blocos de pixel, cada casa com uma cor da paleta (textura de bloco). */
function BlockRing({ palette, seed }: { palette: string[]; seed: number }) {
  return (
    <g shapeRendering="crispEdges">
      {RING_CELLS.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={4} height={4} fill={palette[Math.floor(rnd(i + seed) * palette.length)]} />
      ))}
    </g>
  );
}

function Gem({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return (
    <g>
      <path d={`M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`} fill={fill} stroke="#3b2405" strokeWidth={0.6} />
      <path d={`M${x} ${y - r}L${x + r * 0.45} ${y - r * 0.1}L${x - r * 0.2} ${y}Z`} fill="#fff" opacity={0.65} />
    </g>
  );
}

function Shine({ id }: { id: string }) {
  return (
    <circle
      className="fr-anim fr-spin"
      cx={50}
      cy={50}
      r={46}
      fill="none"
      stroke={`url(#${id})`}
      strokeWidth={8}
      strokeDasharray="22 268"
      opacity={0.7}
    />
  );
}

function PixelHeart({ x, y, s, className, style }: { x: number; y: number; s: number; className?: string; style?: React.CSSProperties }) {
  return (
    <g className={className} style={style}>
      {HEART.flatMap((row, j) =>
        [...row].map((c, i) =>
          c === "X" ? <rect key={`${i}-${j}`} x={x + i * s} y={y + j * s} width={s} height={s} fill={j === 0 && i < 3 ? "#ffd0e4" : "#ff4f8b"} /> : null,
        ),
      )}
    </g>
  );
}

export function FrameArt({ frame }: { frame: string }) {
  const u = useId().replace(/:/g, "");
  const g = (name: string) => `${u}-${name}`;
  const url = (name: string) => `url(#${g(name)})`;

  const shineGrad = (
    <linearGradient id={g("shine")} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#fff" stopOpacity="0" />
      <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  );

  // a moldura holográfica é um anel em CSS (conic-gradient não existe em SVG) com brilhos por cima
  if (frame === "holografica") {
    return (
      <>
        <span className="fr-holo fr-anim" aria-hidden />
        <svg className="fr" viewBox="-15 -15 130 130" aria-hidden>
          <circle cx={50} cy={50} r={42.3} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth={0.8} />
          <circle cx={50} cy={50} r={49.6} fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth={0.8} />
          {steps(6, -60).map((d, i) => {
            const [x, y] = at(54, d);
            return (
              <path
                key={d}
                className="fr-anim fr-twinkle"
                d={SPARK}
                transform={`translate(${x} ${y}) scale(${i % 2 ? 0.8 : 1.2})`}
                fill="#fff"
                style={{ animationDelay: `${i * 0.45}s` }}
              />
            );
          })}
        </svg>
      </>
    );
  }

  let body: React.ReactNode;
  switch (frame) {
    case "vidro":
      body = (
        <>
          <defs>
            <linearGradient id={g("v")} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.92" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0.2" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("v")} strokeWidth={8} />
          <path d="M14 34A40 40 0 0 1 34 14" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
          <circle cx={50} cy={50} r={42.3} fill="none" stroke="rgb(0 0 0 / 0.25)" strokeWidth={0.7} />
        </>
      );
      break;
    case "neon":
      body = (
        <g className="fr-glow">
          <circle cx={50} cy={50} r={46} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={5.5} />
          <circle cx={50} cy={50} r={46} fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.75} />
          <circle cx={50} cy={50} r={49.3} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={0.8} opacity={0.6} />
        </g>
      );
      break;
    case "folhagem":
      body = (
        <>
          <circle cx={50} cy={50} r={46} fill="none" stroke="#2c5e33" strokeWidth={7} />
          <circle cx={50} cy={50} r={46} fill="none" stroke="#6a4a24" strokeWidth={1.4} strokeDasharray="5 3" />
          {steps(20).map((d, i) => {
            const [x, y] = at(i % 2 ? 50 : 47, d);
            return (
              <ellipse
                key={d}
                cx={x}
                cy={y}
                rx={5.4}
                ry={2.3}
                transform={`rotate(${d + 90 + (i % 2 ? 35 : -35)} ${x} ${y})`}
                fill={i % 3 === 0 ? "#8fd16a" : i % 3 === 1 ? "#5fae4e" : "#3f8f3d"}
                stroke="#1f4a24"
                strokeWidth={0.4}
              />
            );
          })}
          {steps(5, 20).map((d) => {
            const [x, y] = at(50, d);
            return <circle key={d} cx={x} cy={y} r={1.6} fill="#ffd6e8" stroke="#e06a9a" strokeWidth={0.5} />;
          })}
        </>
      );
      break;
    case "ouro":
      body = (
        <>
          <defs>
            <linearGradient id={g("o")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff4c2" />
              <stop offset="0.25" stopColor="#e7b23a" />
              <stop offset="0.5" stopColor="#8a5a12" />
              <stop offset="0.72" stopColor="#f8d36a" />
              <stop offset="1" stopColor="#b9791a" />
            </linearGradient>
            {shineGrad}
          </defs>
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("o")} strokeWidth={8} />
          <circle cx={50} cy={50} r={49.6} fill="none" stroke="#5a3a08" strokeWidth={0.8} />
          <circle cx={50} cy={50} r={42.4} fill="none" stroke="#fff1c0" strokeWidth={0.8} opacity={0.7} />
          <circle cx={50} cy={50} r={46} fill="none" stroke="#6b4510" strokeWidth={0.5} strokeDasharray="1 3" opacity={0.6} />
          <Shine id={g("shine")} />
          <Gem x={50} y={4} r={5.2} fill="#e0314b" />
          <Gem x={96} y={50} r={4.2} fill="#3b7bff" />
          <Gem x={4} y={50} r={4.2} fill="#3b7bff" />
          <Gem x={50} y={96} r={4.2} fill="#22b573" />
        </>
      );
      break;
    case "pixel":
    case "pixel-coracao": {
      const heart = frame === "pixel-coracao";
      body = (
        <g shapeRendering="crispEdges">
          <defs>
            <pattern id={g("p")} width={4} height={4} patternUnits="userSpaceOnUse">
              <rect width={4} height={4} fill={heart ? "#7a2a6b" : "#7a4f12"} />
              <rect width={2} height={2} fill={heart ? "#d45bb0" : "#e8c22a"} />
              <rect x={2} y={2} width={2} height={2} fill={heart ? "#d45bb0" : "#e8c22a"} />
            </pattern>
          </defs>
          <path d={`${PIXEL_OUTER}${PIXEL_INNER}`} fillRule="evenodd" fill={url("p")} stroke={heart ? "#3a0f33" : "#3b2405"} strokeWidth={1} />
          {heart ? (
            <>
              <PixelHeart x={-6} y={-6} s={2} className="fr-anim fr-beat" />
              <PixelHeart x={92} y={-6} s={2} className="fr-anim fr-beat" style={{ animationDelay: "0.3s" }} />
              <PixelHeart x={-6} y={94} s={2} className="fr-anim fr-beat" style={{ animationDelay: "0.6s" }} />
              <PixelHeart x={92} y={94} s={2} className="fr-anim fr-beat" style={{ animationDelay: "0.9s" }} />
            </>
          ) : (
            <>
              <rect x={4} y={4} width={4} height={4} fill="#fff6c8" className="fr-anim fr-twinkle" />
              <rect x={92} y={92} width={4} height={4} fill="#fff6c8" className="fr-anim fr-twinkle" style={{ animationDelay: "0.9s" }} />
            </>
          )}
        </g>
      );
      break;
    }
    case "bloco-grama": {
      const drips = Array.from({ length: 25 }, (_, i) => 1 + Math.floor(rnd(i + 7) * 3));
      body = (
        <g shapeRendering="crispEdges">
          <BlockRing palette={["#6b4a2b", "#7d5732", "#5a3d22", "#8a6239", "#6b4a2b"]} seed={3} />
          {/* grama em cima, escorrendo pelas laterais */}
          <rect x={0} y={0} width={100} height={4} fill="#7fd05a" />
          {drips.map((d, i) => (
            <rect key={i} x={i * 4} y={4} width={4} height={d * 2} fill={i % 3 === 0 ? "#5fae3e" : "#4e9a32"} />
          ))}
          <rect x={0} y={0} width={4} height={14} fill="#4e9a32" />
          <rect x={96} y={0} width={4} height={12} fill="#4e9a32" />
          <rect x={8} y={0} width={4} height={2} fill="#a6e77f" />
          <rect x={60} y={0} width={8} height={2} fill="#a6e77f" />
        </g>
      );
      break;
    }
    case "minerio": {
      const ores = ["#4fe3e0", "#f2c94c", "#e0453c", "#3ddc84"];
      const spots = RING_CELLS.filter((_, i) => rnd(i + 31) > 0.86);
      body = (
        <g shapeRendering="crispEdges">
          <BlockRing palette={["#7d7d7d", "#6a6a6a", "#8f8f8f", "#5f5f5f"]} seed={11} />
          {spots.map(([x, y], i) => (
            <g key={i} className={i % 3 === 0 ? "fr-anim fr-twinkle" : undefined} style={{ animationDelay: `${(i * 0.37) % 2.4}s` }}>
              <rect x={x + 1} y={y + 1} width={2} height={2} fill={ores[i % ores.length]} />
              <rect x={x} y={y + 2} width={1} height={1} fill={ores[i % ores.length]} />
            </g>
          ))}
        </g>
      );
      break;
    }
    case "portal": {
      const sparks = RING_CELLS.filter((_, i) => rnd(i + 53) > 0.8);
      body = (
        <g shapeRendering="crispEdges">
          <BlockRing palette={["#140a26", "#1d1035", "#2a1748", "#0f0820"]} seed={23} />
          <path d={PIXEL_INNER} fill="none" stroke="#b57bff" strokeWidth={1.4} opacity={0.9} />
          {sparks.map(([x, y], i) => (
            <rect
              key={i}
              className="fr-anim fr-twinkle"
              x={x + 1}
              y={y + 1}
              width={2}
              height={2}
              fill={i % 2 ? "#c48bff" : "#7d3cff"}
              style={{ animationDelay: `${(i * 0.29) % 2.4}s` }}
            />
          ))}
        </g>
      );
      break;
    }
    case "cristal":
      body = (
        <>
          <defs>
            <linearGradient id={g("c")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2fdff" />
              <stop offset="0.5" stopColor="#7fd3ff" />
              <stop offset="1" stopColor="#2a6fc1" />
            </linearGradient>
          </defs>
          {steps(8, -90).map((d, i) => (
            <path
              key={d}
              d={i % 2 ? "M48.2 6L50 -3L51.8 6L50 9Z" : "M47.6 6L50 -10L52.4 6L50 9Z"}
              transform={`rotate(${d + 90} 50 50)`}
              fill={url("c")}
              stroke="#e9fbff"
              strokeWidth={0.5}
            />
          ))}
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("c")} strokeWidth={7} />
          <circle cx={50} cy={50} r={46} fill="none" stroke="#fff" strokeWidth={0.6} strokeDasharray="2 6" opacity={0.8} />
          {[-90, 0, 135].map((d, i) => {
            const [x, y] = at(i === 0 ? 61 : 52, d);
            return (
              <path
                key={d}
                className="fr-anim fr-twinkle"
                d={SPARK}
                transform={`translate(${x} ${y})`}
                fill="#fff"
                style={{ animationDelay: `${i * 0.7}s` }}
              />
            );
          })}
        </>
      );
      break;
    case "circuito":
      body = (
        <>
          <circle cx={50} cy={50} r={46} fill="none" stroke="#0d171f" strokeWidth={8} />
          <g className="fr-glow">
            <circle cx={50} cy={50} r={42.6} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={0.8} />
            <circle cx={50} cy={50} r={49.4} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={0.8} />
            <circle
              className="fr-anim fr-flow"
              cx={50}
              cy={50}
              r={46}
              fill="none"
              style={{ stroke: "var(--accent)" }}
              strokeWidth={1.3}
              strokeDasharray="7 4 2 4"
            />
            {steps(8, 22.5).map((d) => {
              const [x, y] = at(46, d);
              return <circle key={d} cx={x} cy={y} r={1.8} fill="#fff" style={{ stroke: "var(--accent)" }} strokeWidth={0.8} />;
            })}
          </g>
        </>
      );
      break;
    case "espinhos":
      body = (
        <>
          <defs>
            <linearGradient id={g("e")} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#2a070c" />
              <stop offset="1" stopColor="#a11d30" />
            </linearGradient>
          </defs>
          {steps(16).map((d, i) => (
            <path key={d} d={i % 2 ? "M47.5 5L50 -4L52.5 5Z" : "M47 5L50 -10L53 5Z"} transform={`rotate(${d} 50 50)`} fill={url("e")} />
          ))}
          <circle className="fr-anim fr-pulse-red" cx={50} cy={50} r={46} fill="none" stroke="#3a0a12" strokeWidth={7} />
          <circle cx={50} cy={50} r={46} fill="none" stroke="#c23a4e" strokeWidth={0.8} strokeDasharray="3 2" />
        </>
      );
      break;
    case "gladiador":
      body = (
        <>
          <defs>
            <linearGradient id={g("b")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0b27a" />
              <stop offset="0.35" stopColor="#b87333" />
              <stop offset="0.65" stopColor="#5a3214" />
              <stop offset="1" stopColor="#e0a070" />
            </linearGradient>
            {shineGrad}
          </defs>
          {[...steps(9, 105, 125), ...steps(9, 75, -125)].map((d, i) => {
            const [x, y] = at(54, d);
            const left = i < 9;
            return (
              <ellipse
                key={`${d}-${i}`}
                cx={x}
                cy={y}
                rx={5}
                ry={2.1}
                transform={`rotate(${d + 90 + (left ? 35 : -35)} ${x} ${y})`}
                fill={i % 2 ? "#d8b43c" : "#a8891f"}
                stroke="#5a4708"
                strokeWidth={0.4}
              />
            );
          })}
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("b")} strokeWidth={8} />
          <circle cx={50} cy={50} r={46} fill="none" stroke="#3a1f0a" strokeWidth={0.6} strokeDasharray="0.5 4.5" />
          <Shine id={g("shine")} />
          <path d="M42 93H58V99C58 105 54 108 50 110C46 108 42 105 42 99Z" fill={url("b")} stroke="#3a1f0a" strokeWidth={0.8} />
          <path d="M50 94.5V108M44 100H56" stroke="#3a1f0a" strokeWidth={1} />
        </>
      );
      break;
    case "chamas":
      body = (
        <>
          <defs>
            <linearGradient id={g("f")} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#ffe066" />
              <stop offset="0.45" stopColor="#ff8a00" />
              <stop offset="1" stopColor="#ff2d00" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id={g("fr")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffcf3a" />
              <stop offset="0.5" stopColor="#ff5a00" />
              <stop offset="1" stopColor="#a31a00" />
            </linearGradient>
          </defs>
          {steps(14).map((d, i) => (
            <g key={d} transform={`rotate(${d} 50 50)`}>
              <path
                className="fr-anim fr-flicker"
                d={i % 2 ? "M46.5 8C45.5 3 48 0 50 -5C52 0 54.5 3 53.5 8Z" : "M45.5 8C44 2 48 -3 50 -11C52 -3 56 2 54.5 8Z"}
                fill={url("f")}
                style={{ animationDelay: `${(i * 0.17) % 1}s` }}
              />
            </g>
          ))}
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("fr")} strokeWidth={7} />
          <circle cx={50} cy={50} r={42.6} fill="none" stroke="#ffe7a0" strokeWidth={0.7} opacity={0.8} />
        </>
      );
      break;
    case "runas":
      body = (
        <>
          <circle cx={50} cy={50} r={46} fill="none" stroke="#161a28" strokeWidth={9} />
          <g className="fr-glow">
            <circle cx={50} cy={50} r={42} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={0.7} opacity={0.8} />
            <circle cx={50} cy={50} r={50} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={0.7} opacity={0.8} />
            <g className="fr-anim fr-spin-slow">
              {steps(12).map((d, i) => {
                const [x, y] = at(46, d);
                return (
                  <path
                    key={d}
                    className="fr-anim fr-rune"
                    d={RUNES[i % RUNES.length]}
                    transform={`translate(${x} ${y}) rotate(${d + 90}) scale(0.95)`}
                    fill="none"
                    style={{ stroke: "var(--accent)", animationDelay: `${i * 0.25}s` }}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
          </g>
        </>
      );
      break;
    case "coroa":
      body = (
        <>
          <defs>
            <linearGradient id={g("k")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff4c2" />
              <stop offset="0.3" stopColor="#f0c040" />
              <stop offset="0.6" stopColor="#9c6a12" />
              <stop offset="1" stopColor="#f8d36a" />
            </linearGradient>
            {shineGrad}
          </defs>
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("k")} strokeWidth={7} />
          <circle cx={50} cy={50} r={49.5} fill="none" stroke="#5a3a08" strokeWidth={0.7} />
          <Shine id={g("shine")} />
          <path d="M32 6L30 -9L40 -1L50 -15L60 -1L70 -9L68 6Z" fill={url("k")} stroke="#6b4510" strokeWidth={0.8} strokeLinejoin="round" />
          <rect x={32} y={1.5} width={36} height={5} rx={1} fill="#c8901e" stroke="#6b4510" strokeWidth={0.6} />
          <circle className="fr-anim fr-twinkle" cx={50} cy={-15} r={2.4} fill="#e0314b" stroke="#fff" strokeWidth={0.5} />
          <circle cx={30} cy={-9} r={1.8} fill="#3b7bff" stroke="#fff" strokeWidth={0.4} />
          <circle cx={70} cy={-9} r={1.8} fill="#3b7bff" stroke="#fff" strokeWidth={0.4} />
          {[40, 50, 60].map((x) => (
            <circle key={x} cx={x} cy={4} r={1.3} fill={x === 50 ? "#22b573" : "#e0314b"} />
          ))}
        </>
      );
      break;
    case "cosmica":
      body = (
        <>
          <defs>
            <linearGradient id={g("n")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3a1a7a" />
              <stop offset="0.4" stopColor="#120a33" />
              <stop offset="0.7" stopColor="#1a3a8a" />
              <stop offset="1" stopColor="#7a2a8a" />
            </linearGradient>
          </defs>
          <circle cx={50} cy={50} r={56} fill="none" stroke="#a78bfa" strokeWidth={0.5} strokeDasharray="1 3" opacity={0.6} />
          <circle cx={50} cy={50} r={46} fill="none" stroke={url("n")} strokeWidth={9} />
          <g className="fr-anim fr-spin-slow">
            {Array.from({ length: 26 }, (_, i) => {
              const [x, y] = at(42.5 + ((i * 5) % 8), i * 137.5);
              return (
                <circle
                  key={i}
                  className="fr-anim fr-twinkle"
                  cx={x}
                  cy={y}
                  r={i % 5 === 0 ? 0.9 : 0.5}
                  fill="#fff"
                  style={{ animationDelay: `${(i * 0.23) % 2.4}s` }}
                />
              );
            })}
          </g>
          <g className="fr-anim fr-spin">
            <circle cx={50} cy={-6} r={3} fill="#ffb86b" stroke="#fff" strokeWidth={0.4} />
            <ellipse cx={50} cy={-6} rx={5.5} ry={1.3} fill="none" stroke="#ffe0b0" strokeWidth={0.5} transform="rotate(-20 50 -6)" />
          </g>
          <circle cx={50} cy={50} r={42.3} fill="none" stroke="#c9b8ff" strokeWidth={0.6} opacity={0.7} />
        </>
      );
      break;
    default:
      body = <circle cx={50} cy={50} r={46} fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth={8} />;
  }

  return (
    <svg className="fr" viewBox="-15 -15 130 130" aria-hidden>
      {body}
    </svg>
  );
}
