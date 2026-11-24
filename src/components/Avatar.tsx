import { AVATAR_PRESETS } from "../lib/catalog";
import { useAnimate } from "../lib/motion";
import { itemValue, STARTER_AVATAR } from "../lib/shop";
import { useStore } from "../lib/state";
import type { Profile } from "../lib/types";
import { FrameArt, SQUARE_FRAMES } from "./FrameArt";

type Props = {
  profile: Partial<Profile>;
  size: number;
  /** moldura ("frame:<id>"); por padrão a do perfil, null = sem moldura */
  frame?: string | null;
  /** efeito ("avatarFx:<id>"); por padrão o do perfil, null = sem efeito */
  fx?: string | null;
  /** é o perfil em destaque (anima mesmo com "só no meu perfil") */
  live?: boolean;
};

const SPARKS = Array.from({ length: 10 }, (_, i) => ({ a: (i * 137.5) % 360, d: (i * 0.37) % 2.4 }));

/** Avatar com moldura e efeito. O tamanho total é sempre `size`: a moldura encolhe o rosto. */
export function Avatar({ profile, size, frame, fx, live }: Props) {
  const { item } = useStore();
  const animate = useAnimate(live);
  // perfil antigo de um amigo (até a 0.5) ainda traz a cor do avatar de iniciais
  const avatarId = profile.avatarId ?? `avatar:ini-${(profile.avatarPreset ?? 0) % AVATAR_PRESETS.length}`;
  const it = item(avatarId) ?? item(STARTER_AVATAR);
  const f = itemValue(frame === undefined ? profile.frame : (frame ?? undefined)) || undefined;
  const e = itemValue(fx === undefined ? profile.avatarFx : (fx ?? undefined)) || undefined;

  const ini = it?.id.startsWith("avatar:ini-") ? AVATAR_PRESETS[Number(it.id.slice("avatar:ini-".length)) % AVATAR_PRESETS.length] : undefined;
  const initials = (profile.nickname || "J")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className="av"
      data-frame={f}
      data-fx={e}
      data-shape={f && SQUARE_FRAMES.has(f) ? "square" : undefined}
      data-still={animate ? undefined : true}
      style={{ width: size, height: size, ["--av" as string]: `${size}px` }}
    >
      {e === "aura" && <span className="fx-aura" aria-hidden />}
      {e === "fumaca" && (
        <span className="fx-smoke" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      <span className="av-face" data-pixel={it?.pixel || undefined}>
        {ini || !it?.image ? (
          <span className="av-ini" style={{ background: (ini ?? AVATAR_PRESETS[0]).bg, color: (ini ?? AVATAR_PRESETS[0]).fg, fontSize: size * 0.34 }}>
            {initials}
          </span>
        ) : (
          <img src={it.image} alt="" draggable={false} />
        )}
      </span>
      {f && <FrameArt frame={f} />}
      {e === "faiscas" && (
        <span className="fx-sparks" aria-hidden>
          {SPARKS.map((s, i) => (
            <i key={i} style={{ ["--a" as string]: `${s.a}deg`, animationDelay: `${s.d}s` }} />
          ))}
        </span>
      )}
      {e === "orbita" && (
        <span className="fx-orbit" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      )}
    </span>
  );
}
