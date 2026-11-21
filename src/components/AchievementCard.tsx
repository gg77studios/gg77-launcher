import { LockSimple, Medal, Question } from "@phosphor-icons/react";
import { TIER_XP } from "../lib/catalog";
import { fmtDate } from "../lib/format";
import type { AchievementDef, Unlock } from "../lib/types";

type Props = {
  def: AchievementDef;
  unlock?: Unlock;
  game?: string;
  compact?: boolean;
};

export function AchievementCard({ def, unlock, game, compact }: Props) {
  const secret = def.hidden && !unlock;
  return (
    <div className="ach" data-tier={def.tier} data-unlocked={!!unlock || undefined} data-compact={compact || undefined}>
      <span className="ach-medal" aria-hidden>
        {unlock ? <Medal size={compact ? 20 : 26} weight="fill" /> : secret ? <Question size={20} weight="bold" /> : <LockSimple size={18} weight="bold" />}
      </span>
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
