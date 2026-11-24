import { useAnimate } from "../lib/motion";
import { itemValue } from "../lib/shop";
import { useStore } from "../lib/state";
import type { Profile } from "../lib/types";
import { Avatar } from "./Avatar";
import { BannerFx } from "./BannerFx";

/** Apelido com o estilo da loja ("nameStyle:<id>"). */
export function Nick({ style, children, live, as: Tag = "span" }: { style?: string; children: React.ReactNode; live?: boolean; as?: "span" | "h1" | "h2" | "strong" }) {
  const animate = useAnimate(live);
  const s = itemValue(style) || undefined;
  return (
    <Tag className="nick" data-style={s} data-still={animate ? undefined : true} data-text={typeof children === "string" ? children : undefined}>
      {children}
    </Tag>
  );
}

/** Banner do perfil (imagem ou degradê) com o efeito por cima. */
export function ProfileBanner({ profile, live, className }: { profile: Partial<Profile>; live?: boolean; className?: string }) {
  const { item } = useStore();
  const animate = useAnimate(live);
  const image = item(profile.banner)?.image;
  const fx = itemValue(profile.bannerFx);
  return (
    <div className={`pbanner${className ? ` ${className}` : ""}`} style={image ? { backgroundImage: `url(${image})` } : undefined} data-empty={!image || undefined}>
      {fx && <BannerFx kind={fx} running={animate} />}
    </div>
  );
}

type Props = {
  profile: Profile;
  level?: number;
  titleText?: string;
  size?: "lg" | "md";
  /** é o perfil em destaque (anima mesmo com "só no meu perfil") */
  live?: boolean;
  /** troca o apelido por um campo editável */
  nickSlot?: React.ReactNode;
  children?: React.ReactNode;
};

/** O cartão do perfil: o mesmo no Perfil, no provador da loja e no perfil de um amigo. */
export function ProfileCard({ profile, level, titleText, size = "md", live, nickSlot, children }: Props) {
  const big = size === "lg";
  return (
    <div className="pcard glass" data-size={size}>
      <ProfileBanner profile={profile} live={live} />
      <div className="pcard-body">
        <div className="pcard-avatar">
          <Avatar profile={profile} size={big ? 140 : 92} live={live} />
        </div>
        <div className="pcard-id">
          {nickSlot ?? (
            <Nick style={profile.nameStyle} live={live} as={big ? "h1" : "h2"}>
              {profile.nickname || "Jogador"}
            </Nick>
          )}
          {titleText && <div className="profile-title">{titleText}</div>}
          {level !== undefined && (
            <div className="profile-level">
              <span className="level-badge level-badge--sm">{level}</span>
              Nível {level}
            </div>
          )}
          {profile.bio && !big && <p className="pcard-bio">{profile.bio}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
