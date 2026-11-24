import { itemValue, THEME_PREVIEW } from "../lib/shop";
import { useStore } from "../lib/state";
import type { Profile, ShopItem } from "../lib/types";
import { Avatar } from "./Avatar";
import { Nick, ProfileBanner } from "./ProfileCard";

/** O perfil vestindo um item (para o provador e as prévias). */
export function wearing(profile: Profile, it: ShopItem): Profile {
  switch (it.kind) {
    case "avatar":
      return { ...profile, avatarId: it.id };
    case "banner":
      return { ...profile, banner: it.id };
    case "frame":
      return { ...profile, frame: it.id };
    case "avatarFx":
      return { ...profile, avatarFx: it.id };
    case "bannerFx":
      return { ...profile, bannerFx: it.id };
    case "nameStyle":
      return { ...profile, nameStyle: it.id };
    default:
      return profile;
  }
}

/** Miniatura de um tema: fundo, dois painéis e a cor de destaque. */
export function ThemeSwatch({ id }: { id: string }) {
  const t = THEME_PREVIEW[id] ?? THEME_PREVIEW.grafite;
  return (
    <span className="theme-preview" style={{ background: t.bg }} data-theme-preview={id}>
      <i style={{ background: t.surface }} />
      <i style={{ background: t.surface }} />
      <b />
    </span>
  );
}

/** Miniatura de um fundo do launcher (o mesmo desenho do papel de parede). */
export function WallpaperSwatch({ id, image }: { id: string; image?: string }) {
  return (
    <span className="wp-swatch">
      <span
        className={image ? "wall-img" : `wall-img wall-img--${itemValue(id) === "degrade" ? "mesh" : itemValue(id)}`}
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      />
    </span>
  );
}

/** Prévia do item no próprio perfil do usuário. `live` anima (hover, provador). */
export function ItemPreview({ it, live, size = 72 }: { it: ShopItem; live?: boolean; size?: number }) {
  const { state } = useStore();
  const me = state.profile;
  const p = wearing(me, it);
  switch (it.kind) {
    case "avatar":
      return <Avatar profile={p} size={size} frame={null} fx={null} live={live} />;
    case "frame":
      return <Avatar profile={p} size={size} fx={null} live={live} />;
    case "avatarFx":
      return <Avatar profile={p} size={size} frame={null} live={live} />;
    case "banner":
    case "bannerFx":
      return <ProfileBanner profile={p} live={live} className="pbanner--mini" />;
    case "nameStyle":
      return (
        <span className="nick-preview">
          <Nick style={it.id} live={live}>
            {me.nickname || "Jogador"}
          </Nick>
        </span>
      );
    case "theme":
      return <ThemeSwatch id={itemValue(it.id)} />;
    case "wallpaper":
      return <WallpaperSwatch id={it.id} />;
  }
}
