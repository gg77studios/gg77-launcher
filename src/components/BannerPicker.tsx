import { Check, LockSimple, UploadSimple, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { imageToDataUrl } from "../lib/platform";
import { type BannerOption, useStore } from "../lib/state";

/** Galeria de banners do perfil: os liberados por conquista em cada jogo, mais uma imagem própria. */
export function BannerPicker({ onClose }: { onClose: () => void }) {
  const { state, dispatch, banners } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const uploadId = useId();
  const current = state.profile.banner;
  const isCustom = !!current && !current.startsWith("ref:");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const groups = banners.reduce<Array<{ gameId: string; title: string; items: BannerOption[] }>>((acc, b) => {
    const g = acc.find((x) => x.gameId === b.gameId);
    if (g) g.items.push(b);
    else acc.push({ gameId: b.gameId, title: b.gameTitle, items: [b] });
    return acc;
  }, []);

  const choose = (value: string | undefined) => dispatch({ type: "profile", patch: { banner: value } });

  return (
    <dialog ref={ref} className="dialog dialog--wide" onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>Banner do perfil</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      <div className="banner-groups">
        {groups.map((g) => {
          const free = g.items.filter((b) => b.unlocked).length;
          return (
            <section key={g.gameId}>
              <h3>
                {g.title}
                <span>
                  {free} de {g.items.length}
                </span>
              </h3>
              <div className="banner-grid">
                {g.items.map((b) => {
                  const selected = b.def.id === "padrao" && b.gameId === "launcher" ? !current : current === b.ref;
                  return (
                    <button
                      key={b.ref}
                      type="button"
                      className="banner-tile"
                      data-locked={!b.unlocked || undefined}
                      aria-pressed={selected}
                      disabled={!b.unlocked}
                      onClick={() => choose(b.gameId === "launcher" && b.def.id === "padrao" ? undefined : b.ref)}
                      title={b.unlocked ? b.def.title : `Libere com: ${b.requirement}`}
                    >
                      <span className="banner-img" style={b.def.image ? { backgroundImage: `url(${b.def.image})` } : undefined} />
                      <span className="banner-cap">
                        <strong>{b.def.title}</strong>
                        {!b.unlocked && (
                          <span>
                            <LockSimple size={12} weight="bold" aria-hidden /> {b.requirement}
                          </span>
                        )}
                      </span>
                      {selected && (
                        <span className="banner-check" aria-hidden>
                          <Check size={14} weight="bold" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section>
          <h3>Imagem própria</h3>
          <div className="banner-grid">
            {isCustom && (
              <button type="button" className="banner-tile" aria-pressed>
                <span className="banner-img" style={{ backgroundImage: `url(${current})` }} />
                <span className="banner-cap">
                  <strong>Sua imagem</strong>
                </span>
                <span className="banner-check" aria-hidden>
                  <Check size={14} weight="bold" />
                </span>
              </button>
            )}
            <label className="banner-tile banner-upload" htmlFor={uploadId}>
              <UploadSimple size={22} aria-hidden />
              <span>Enviar imagem</span>
            </label>
            <input
              id={uploadId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) choose(await imageToDataUrl(f, 1800, 600, 0.82));
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>
    </dialog>
  );
}
