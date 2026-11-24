import { useEffect, useRef } from "react";

/*
 * Efeito animado sobre o banner do perfil, num canvas. Só roda quando `running` (perfil em
 * destaque e animações ligadas); parado, desenha um quadro fixo. Pausa com a janela escondida.
 */

type P = { x: number; y: number; vx: number; vy: number; r: number; p: number; life: number };

type Fx = {
  count: (w: number, h: number) => number;
  spawn: (w: number, h: number, initial: boolean) => P;
  step?: (p: P, dt: number, t: number, w: number, h: number) => boolean;
  draw: (ctx: CanvasRenderingContext2D, ps: P[], t: number, w: number, h: number) => void;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace("A", String(alpha)));
  g.addColorStop(1, color.replace("A", "0"));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

const EFFECTS: Record<string, Fx> = {
  neve: {
    count: (w, h) => Math.round((w * h) / 9000),
    spawn: (w, h, initial) => ({ x: rnd(0, w), y: initial ? rnd(0, h) : -6, vx: 0, vy: rnd(14, 40), r: rnd(0.8, 2.6), p: rnd(0, 6), life: 0 }),
    step: (p, dt, t, _w, h) => {
      p.y += p.vy * dt;
      p.x += Math.sin(t * 0.8 + p.p) * 12 * dt;
      return p.y < h + 6;
    },
    draw: (ctx, ps) => {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const p of ps) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  vagalumes: {
    count: (w, h) => Math.round((w * h) / 16000),
    spawn: (w, h) => ({ x: rnd(0, w), y: rnd(h * 0.2, h), vx: rnd(-10, 10), vy: rnd(-8, 8), r: rnd(6, 12), p: rnd(0, 6), life: 0 }),
    step: (p, dt, t, w, h) => {
      p.vx += Math.sin(t * 0.7 + p.p) * 6 * dt;
      p.vy += Math.cos(t * 0.5 + p.p) * 6 * dt;
      p.x = (p.x + p.vx * dt + w) % w;
      p.y = Math.min(h, Math.max(0, p.y + p.vy * dt));
      return true;
    },
    draw: (ctx, ps, t) => {
      for (const p of ps) glow(ctx, p.x, p.y, p.r, "rgba(214,255,120,A)", 0.35 + 0.55 * Math.max(0, Math.sin(t * 2 + p.p)));
    },
  },
  chuva: {
    count: (w, h) => Math.round((w * h) / 3500),
    spawn: (w, h, initial) => ({ x: rnd(-h * 0.3, w), y: initial ? rnd(0, h) : -20, vx: 120, vy: rnd(500, 780), r: rnd(8, 16), p: 0, life: 0 }),
    step: (p, dt, _t, _w, h) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.y < h + 20;
    },
    draw: (ctx, ps) => {
      ctx.strokeStyle = "rgba(200,220,255,0.38)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of ps) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.r * 0.18, p.y - p.r);
      }
      ctx.stroke();
    },
  },
  brasas: {
    count: (w, h) => Math.round((w * h) / 7000),
    spawn: (w, h, initial) => ({ x: rnd(0, w), y: initial ? rnd(0, h) : h + 4, vx: 0, vy: -rnd(20, 70), r: rnd(1, 2.6), p: rnd(0, 6), life: rnd(0.4, 1) }),
    step: (p, dt, t) => {
      p.y += p.vy * dt;
      p.x += Math.sin(t * 1.6 + p.p) * 18 * dt;
      p.life -= dt * 0.12;
      return p.y > -6 && p.life > 0;
    },
    draw: (ctx, ps, t, _w, h) => {
      const g = ctx.createLinearGradient(0, h, 0, h * 0.55);
      g.addColorStop(0, "rgba(255,90,0,0.22)");
      g.addColorStop(1, "rgba(255,90,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.55, ctx.canvas.width, h * 0.45);
      for (const p of ps) glow(ctx, p.x, p.y, p.r * 3.2, "rgba(255,150,40,A)", Math.min(1, p.life) * (0.6 + 0.4 * Math.sin(t * 9 + p.p)));
    },
  },
  estrelas: {
    count: (w, h) => Math.round((w * h) / 2600),
    spawn: (w, h) => ({ x: rnd(0, w), y: rnd(0, h * 0.85), vx: 0, vy: 0, r: rnd(0.4, 1.3), p: rnd(0, 6), life: 0 }),
    draw: (ctx, ps, t, w, h) => {
      for (const p of ps) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + p.p));
        ctx.fillStyle = "#fff";
        ctx.fillRect(p.x, p.y, p.r * 1.6, p.r * 1.6);
      }
      ctx.globalAlpha = 1;
      // uma estrela cadente a cada ~3 s, atravessando o banner na diagonal
      const cycle = 3.2;
      const k = (t % cycle) / 0.9;
      if (k < 1) {
        const n = Math.floor(t / cycle);
        const sx = ((n * 977) % 100) / 100;
        const x0 = w * (0.15 + sx * 0.7);
        const y0 = h * 0.08;
        const x = x0 + k * w * 0.28;
        const y = y0 + k * h * 0.45;
        const g = ctx.createLinearGradient(x, y, x - w * 0.12, y - h * 0.2);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - k)})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - w * 0.12, y - h * 0.2);
        ctx.stroke();
      }
    },
  },
  // pedacinhos de bloco: quadradinhos de terra, grama e pedra caindo e girando
  blocos: {
    count: (w, h) => Math.round((w * h) / 9000),
    spawn: (w, h, initial) => ({ x: rnd(0, w), y: initial ? rnd(0, h) : -8, vx: rnd(-12, 12), vy: rnd(30, 80), r: rnd(3, 6), p: rnd(0, 6), life: Math.floor(rnd(0, 4)) }),
    step: (p, dt, _t, _w, h) => {
      p.vy += 60 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.p += dt * 2;
      return p.y < h + 8;
    },
    draw: (ctx, ps) => {
      const colors = ["#7d5732", "#5fae3e", "#8f8f8f", "#4fe3e0"];
      for (const p of ps) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.round(p.p * 2) * (Math.PI / 4));
        ctx.fillStyle = colors[p.life % colors.length];
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(-p.r / 2, p.r / 6, p.r, p.r / 3);
        ctx.restore();
      }
    },
  },
  aurora: {
    count: () => 3,
    spawn: (_w, _h) => ({ x: 0, y: 0, vx: 0, vy: 0, r: 0, p: rnd(0, 6), life: 0 }),
    draw: (ctx, ps, t, w, h) => {
      const colors = ["rgba(80,255,170,A)", "rgba(90,200,255,A)", "rgba(190,110,255,A)"];
      ctx.globalCompositeOperation = "lighter";
      ps.forEach((p, i) => {
        const base = h * (0.22 + i * 0.13);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 12) {
          const y = base + Math.sin(x * 0.006 + t * (0.35 + i * 0.12) + p.p) * h * 0.09 + Math.sin(x * 0.017 + t * 0.6) * h * 0.03;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, base - h * 0.1, 0, base + h * 0.45);
        g.addColorStop(0, colors[i].replace("A", "0"));
        g.addColorStop(0.15, colors[i].replace("A", "0.32"));
        g.addColorStop(1, colors[i].replace("A", "0"));
        ctx.fillStyle = g;
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    },
  },
};

export function BannerFx({ kind, running }: { kind: string; running: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const fx = EFFECTS[kind];
    if (!canvas || !fx) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let ps: P[] = [];
    let raf = 0;
    let last = performance.now();
    const t0 = last - Math.random() * 3000;

    const fit = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = fx.count(w, h);
      ps = Array.from({ length: n }, () => fx.spawn(w, h, true));
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      if (fx.step) {
        for (let i = 0; i < ps.length; i++) if (!fx.step(ps[i], dt, t, w, h)) ps[i] = fx.spawn(w, h, false);
      }
      ctx.clearRect(0, 0, w, h);
      fx.draw(ctx, ps, t, w, h);
    };

    const loop = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      if (running && !document.hidden) raf = requestAnimationFrame(loop);
      else frame(last);
    };

    fit();
    start();
    const ro = new ResizeObserver(() => {
      fit();
      if (!running) frame(performance.now());
    });
    ro.observe(canvas);
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, [kind, running]);

  return <canvas ref={ref} className="banner-fx" aria-hidden />;
}
