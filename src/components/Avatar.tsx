import { AVATAR_PRESETS } from "../lib/catalog";
import type { Profile } from "../lib/types";

type Props = {
  profile: Profile;
  size: number;
  /** moldura a desenhar; por padrão, a escolhida no perfil */
  frame?: string | null;
};

export function Avatar({ profile, size, frame }: Props) {
  const preset = AVATAR_PRESETS[profile.avatarPreset % AVATAR_PRESETS.length];
  const initials = (profile.nickname || "J")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const face = profile.avatar ? (
    <img className="avatar" src={profile.avatar} alt="" width={size} height={size} style={{ width: size, height: size }} />
  ) : (
    <span
      className="avatar avatar--preset"
      aria-hidden
      style={{ width: size, height: size, background: preset.bg, color: preset.fg, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
  const f = frame === undefined ? profile.frame : frame;
  if (!f) return face;
  return (
    <span className="frame" data-frame={f} style={{ ["--fs" as string]: `${Math.max(3, Math.round(size * 0.06))}px` }}>
      {face}
    </span>
  );
}
