import { LockSimple, Medal, Question } from "@phosphor-icons/react";
import { TIER_XP } from "../lib/catalog";
import { fmtDate } from "../lib/format";
import type { AchievementDef, Unlock } from "../lib/types";

type Props = {
  def: AchievementDef;
  unlock?: Unlock;
  game?: string;
  compact?: boolean;
  /** ícone em pixel art (desenhado sem suavizar) */
  pixel?: boolean;
};

/** Ícone da conquista com o aro da raridade; cinza e com cadeado enquanto bloqueada. */
export function AchievementIcon({
  def,
  unlocked,
  pixel,
  size,
}: {
  def: AchievementDef;
  unlocked: boolean;
  pixel?: boolean;
  size?: number;
}) {
  const secret = def.hidden && !unlocked;
  const art = !!def.icon && !secret;
  return (
    <span
      className="ach-medal"
      data-tier={def.tier}
      data-art={art || undefined}
      data-pixel={(art && pixel) || undefined}
      data-unlocked={unlocked || undefined}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden
    >
      {art ? (
        <img src={def.icon} alt="" loading="lazy" />
      ) : unlocked ? (
        <Medal size={22} weight="fill" />
      ) : secret ? (
        <Question size={20} weight="bold" />
      ) : (
        <LockSimple size={18} weight="bold" />
      )}
      {art && !unlocked && (
        <span className="ach-lock">
          <LockSimple size={11} weight="bold" />
        </span>
      )}
    </span>
  );
}

export function AchievementCard({ def, unlock, game, compact, pixel }: Props) {
  const secret = def.hidden && !unlock;
  return (
    <div className="ach" data-tier={def.tier} data-unlocked={!!unlock || undefined} data-compact={compact || undefined}>
      <AchievementIcon def={def} unlocked={!!unlock} pixel={pixel} />
      <span className="ach-text">
        <strong>{secret ? "Conquista secreta" : def.title}</strong>
        <span>{secret ? "Continue jogando para descobrir." : def.description}</span>
        {!compact && (
          <span className="ach-meta">
            {game && <b>{game}</b>}
            <span>
              {def.tier}, {TIER_XP[def.tier]} XP
            </span>
            {unlock && <span>{fmtDate(unlock.at)}</span>}
          </span>
        )}
      </span>
    </div>
  );
}
