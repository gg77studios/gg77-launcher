import { Check, SpeakerHigh } from "@phosphor-icons/react";
import { ACCENTS } from "../lib/catalog";
import { inkOn } from "../lib/format";
import { chime } from "../lib/sound";
import { useStore } from "../lib/state";
import type { ThemeMode } from "../lib/types";

const THEMES: Array<{ id: ThemeMode; label: string; bg: string; surface: string; ink: string }> = [
  { id: "grafite", label: "Grafite", bg: "#101216", surface: "#1e222a", ink: "#eceef2" },
  { id: "meia-noite", label: "Meia-noite", bg: "#07080d", surface: "#151826", ink: "#eceef2" },
  { id: "claro", label: "Claro", bg: "#f3f4f6", surface: "#ffffff", ink: "#14161b" },
];

export function CustomizeView() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const set = (patch: Partial<typeof s>) => dispatch({ type: "settings", patch });
  const custom = !ACCENTS.some((a) => a.value === s.accent);

  return (
    <div className="customize">
      <h1>Personalizar</h1>

      <section className="panel">
        <h2>Tema</h2>
        <div className="themes" role="radiogroup" aria-label="Tema">
          {THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={s.theme === t.id} className="theme-card" onClick={() => set({ theme: t.id })}>
              <span className="theme-preview" style={{ background: t.bg }}>
                <i style={{ background: t.surface }} />
                <i style={{ background: t.surface }} />
                <b style={{ background: s.accent }} />
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Cor de destaque</h2>
        <div className="swatches" role="radiogroup" aria-label="Cor de destaque">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={s.accent === a.value}
              className="swatch"
              style={{ background: a.value }}
              onClick={() => set({ accent: a.value })}
              title={a.name}
            >
              {s.accent === a.value && <Check size={18} weight="bold" color={inkOn(a.value)} />}
              <span className="sr-only">{a.name}</span>
            </button>
          ))}
          <label className="swatch swatch--custom" data-on={custom || undefined} title="Outra cor">
            <input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Escolher outra cor" />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Ambiente</h2>
        <Toggle
          label="Fundo com a arte do jogo"
          hint="Usa o banner do jogo selecionado, desfocado, atrás do launcher."
          checked={s.ambient}
          onChange={(v) => set({ ambient: v })}
        />
        <Toggle
          label="Som de conquista"
          hint="Um arpejo curto quando algo é desbloqueado."
          checked={s.sound}
          onChange={(v) => set({ sound: v })}
          extra={
            <button type="button" className="btn btn--ghost" onClick={() => chime("épica")}>
              <SpeakerHigh size={14} aria-hidden /> Testar
            </button>
          }
        />
        <Toggle
          label="Notificação do sistema"
          hint="Avisa da conquista mesmo com o jogo em tela cheia."
          checked={s.notifications}
          onChange={(v) => set({ notifications: v })}
        />
      </section>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, extra }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; extra?: React.ReactNode }) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      {extra}
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
        <i />
      </button>
    </div>
  );
}
