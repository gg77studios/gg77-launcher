import { AVATAR_PRESETS } from "../lib/catalog";
import type { Profile } from "../lib/types";

export function Avatar({ profile, size }: { profile: Profile; size: number }) {
  const preset = AVATAR_PRESETS[profile.avatarPreset % AVATAR_PRESETS.length];
  const initials = (profile.nickname || "J")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return profile.avatar ? (
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
}
