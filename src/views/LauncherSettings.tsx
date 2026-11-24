import { Check, LockSimple, SpeakerHigh, Storefront } from "@phosphor-icons/react";
import { ThemeSwatch, WallpaperSwatch } from "../components/ItemPreview";
import { ACCENTS } from "../lib/catalog";
import { inkOn } from "../lib/format";
import { useNav } from "../lib/nav";
import { itemValue, THEME_ITEMS, WALLPAPER_ITEMS } from "../lib/shop";
import { chime } from "../lib/sound";
import { useStore } from "../lib/state";
import type { Settings } from "../lib/types";

type Opt<T extends string> = ReadonlyArray<readonly [T, string]>;

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Opt<T>; onChange: (v: T) => void }) {
  return (
    <div className="setting">
      <span className="setting-label">{label}</span>
      <div className="segmented glass glass--field" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const FONTS: Array<{ id: Settings["font"]; name: string; family: string }> = [
  { id: "figtree", name: "Figtree", family: '"Figtree Variable"' },
  { id: "nunito", name: "Nunito", family: '"Nunito Variable"' },
  { id: "space-grotesk", name: "Space Grotesk", family: '"Space Grotesk Variable"' },
  { id: "pixelify", name: "Pixel nos títulos", family: '"Pixelify Sans Variable"' },
];

/** Aparência e comportamento do launcher neste PC. Temas e fundos pagos vêm da loja. */
export function LauncherSettings() {
  const { state, dispatch, owns, shop, item } = useStore();
  const { go } = useNav();
  const s = state.settings;
  const set = (patch: Partial<Settings>) => dispatch({ type: "settings", patch });
  const custom = !ACCENTS.some((a) => a.value === s.accent);
  const ownedBanners = shop.filter((i) => i.kind === "banner" && i.image && owns(i.id));

  return (
    <div className="launcher-settings">
      <section className="panel glass ls-wide">
        <div className="panel-head">
          <h2>Tema</h2>
          <button type="button" className="link-btn" onClick={() => go("loja", { tab: "theme" })}>
            <Storefront size={14} aria-hidden /> Mais temas na loja
          </button>
        </div>
        <div className="themes" role="radiogroup" aria-label="Tema">
          {THEME_ITEMS.map((t) => {
            const id = itemValue(t.id);
            const has = owns(t.id);
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={s.theme === id}
                className="theme-card"
                data-locked={!has || undefined}
                onClick={() => (has ? set({ theme: id }) : go("loja", { tab: "theme" }))}
                title={has ? t.name : `${t.name}: na loja`}
              >
                <ThemeSwatch id={id} />
                <span>
                  {!has && <LockSimple size={12} weight="bold" aria-hidden />} {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel glass">
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
        <Segmented
          label="Vidro"
          value={s.glass}
          options={[
            ["liquido", "Líquido"],
            ["solido", "Sólido"],
          ]}
          onChange={(v) => set({ glass: v })}
        />
      </section>

      <section className="panel glass">
        <h2>Fundo</h2>
        <Segmented
          label="Fundo das outras telas (a Biblioteca sempre mostra a arte do jogo)"
          value={s.ambient ? "jogo" : "fundo"}
          options={[
            ["jogo", "Arte do jogo"],
            ["fundo", "Fundo escolhido"],
          ]}
          onChange={(v) => set({ ambient: v === "jogo" })}
        />
        <div className="wp-grid" role="radiogroup" aria-label="Fundo escolhido" data-off={s.ambient || undefined}>
          {[...WALLPAPER_ITEMS, ...ownedBanners].map((w) => {
            const has = owns(w.id);
            return (
              <button
                key={w.id}
                type="button"
                role="radio"
                className="wp-tile"
                aria-checked={!s.ambient && s.wallpaper === w.id}
                data-locked={!has || undefined}
                onClick={() => (has ? set({ wallpaper: w.id, ambient: false }) : go("loja", { tab: "wallpaper" }))}
                title={has ? w.name : `${w.name}: na loja`}
              >
                <WallpaperSwatch id={w.id} image={w.kind === "banner" ? item(w.id)?.image : undefined} />
                <span>
                  {!has && <LockSimple size={11} weight="bold" aria-hidden />} {w.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel glass">
        <h2>Biblioteca</h2>
        <Segmented
          label="Disposição"
          value={s.library.layout}
          options={[
            ["carrossel", "Carrossel"],
            ["grade", "Grade"],
            ["lista", "Lista"],
          ]}
          onChange={(v) => set({ library: { ...s.library, layout: v } })}
        />
        <Segmented
          label="Tamanho das capas"
          value={s.library.size}
          options={[
            ["p", "Pequenas"],
            ["m", "Médias"],
            ["g", "Grandes"],
          ]}
          onChange={(v) => set({ library: { ...s.library, size: v } })}
        />
        <Segmented
          label="Ordem"
          value={s.library.sort}
          options={[
            ["padrao", "Padrão"],
            ["recente", "Recentes"],
            ["nome", "Nome"],
            ["tempo", "Mais jogados"],
          ]}
          onChange={(v) => set({ library: { ...s.library, sort: v } })}
        />
      </section>

      <section className="panel glass">
        <h2>Barra lateral e texto</h2>
        <Segmented
          label="Barra lateral"
          value={s.sidebar.mode}
          options={[
            ["expandida", "Expandida"],
            ["compacta", "Só ícones"],
          ]}
          onChange={(v) => set({ sidebar: { ...s.sidebar, mode: v } })}
        />
        <Segmented
          label="Lado"
          value={s.sidebar.side}
          options={[
            ["esquerda", "Esquerda"],
            ["direita", "Direita"],
          ]}
          onChange={(v) => set({ sidebar: { ...s.sidebar, side: v } })}
        />
        <div className="setting">
          <span className="setting-label">Fonte</span>
          <div className="fonts" role="radiogroup" aria-label="Fonte">
            {FONTS.map((f) => (
              <button key={f.id} type="button" role="radio" className="font-card" aria-checked={s.font === f.id} onClick={() => set({ font: f.id })}>
                <b style={{ fontFamily: f.family }}>Aa</b>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
        <Segmented
          label="Densidade"
          value={s.density}
          options={[
            ["confortavel", "Confortável"],
            ["compacta", "Compacta"],
          ]}
          onChange={(v) => set({ density: v })}
        />
        <Segmented
          label="Cantos"
          value={s.corners}
          options={[
            ["arredondado", "Arredondados"],
            ["reto", "Retos"],
          ]}
          onChange={(v) => set({ corners: v })}
        />
      </section>

      <section className="panel glass">
        <h2>Animações e avisos</h2>
        <Segmented
          label="Animações de perfil"
          value={s.motion}
          options={[
            ["tudo", "Em todo lugar"],
            ["meu-perfil", "Só no meu perfil"],
            ["nada", "Desligadas"],
          ]}
          onChange={(v) => set({ motion: v })}
        />
        <Toggle
          label="Som de conquista"
          hint="Um arpejo curto quando algo é desbloqueado ou comprado."
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
