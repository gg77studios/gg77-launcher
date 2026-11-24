import { CATALOG, DEFAULT_STATE, LAUNCHER_ACHIEVEMENTS, LAUNCHER_BANNERS, LAUNCHER_ID, TIER_XP, unlockKey, XP_PER_LEVEL } from "./catalog";
import type { Game, Profile, Settings, Tier, Unlock } from "./types";

/*
 * Até a 0.5 as molduras e os banners eram liberados por conquista ou nível, e o avatar/banner
 * aceitavam imagem própria. Na loja (0.6) quem já tinha liberado algo ganha o item de graça
 * (`grants`), e as imagens próprias saem do perfil.
 */
type LegacyFrameRule = { kind: "level"; level: number } | { kind: "achievement"; gameId: string; id: string } | { kind: "tier"; tier: Tier };

const LEGACY_FRAMES: Record<string, LegacyFrameRule | undefined> = {
  vidro: undefined,
  neon: { kind: "level", level: 3 },
  pixel: { kind: "achievement", gameId: "idle-legends", id: "primeira-vitoria" },
  chamas: { kind: "achievement", gameId: "idle-legends", id: "feat_ruin_1" },
  ouro: { kind: "tier", tier: "épica" },
  gladiador: { kind: "achievement", gameId: "idle-legends", id: "arena-top3" },
  holografica: { kind: "level", level: 10 },
};

const isLegacy = (p: Partial<Profile>) => !Array.isArray(p.inventory) && !Array.isArray(p.grants);

/** Tier de uma conquista pelo catálogo (sem catálogo, comum). */
function tierOf(u: Unlock, games: Game[]): Tier {
  const defs = u.gameId === LAUNCHER_ID ? LAUNCHER_ACHIEVEMENTS : (games.find((g) => g.id === u.gameId)?.achievements ?? []);
  return defs.find((d) => d.id === u.id)?.tier ?? "comum";
}

/** O que a conta já tinha liberado pelas regras antigas: vira item ganho. */
function legacyGrants(unlocks: Record<string, Unlock>, games: Game[]): string[] {
  const list = Object.values(unlocks);
  const xp = list.reduce((a, u) => a + TIER_XP[tierOf(u, games)], 0);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const grants: string[] = [];
  for (const [id, rule] of Object.entries(LEGACY_FRAMES)) {
    if (!rule) continue;
    const ok =
      (rule.kind === "level" && level >= rule.level) ||
      (rule.kind === "achievement" && !!unlocks[unlockKey(rule.gameId, rule.id)]) ||
      (rule.kind === "tier" && list.some((u) => tierOf(u, games) === rule.tier));
    if (ok) grants.push(`frame:${id}`);
  }
  const sources = [{ gameId: LAUNCHER_ID, list: LAUNCHER_BANNERS }, ...games.map((g) => ({ gameId: g.id, list: g.banners ?? [] }))];
  for (const { gameId, list } of sources) {
    for (const b of list) if (b.unlock && unlocks[unlockKey(gameId, b.unlock)]) grants.push(`banner:${gameId}:${b.id}`);
  }
  return grants;
}

const union = (...lists: Array<string[] | undefined>) => [...new Set(lists.flatMap((l) => l ?? []))];

/** Converte um perfil salvo (local ou da nuvem) para o formato da loja. Perfil já novo passa igual. */
export function migrateProfile(p: Partial<Profile>, unlocks: Record<string, Unlock>, games: Game[] = CATALOG): Profile {
  const base: Profile = { ...DEFAULT_STATE.profile, ...p };
  if (!isLegacy(p)) return { ...base, inventory: base.inventory ?? [], grants: base.grants ?? [] };
  const { avatar: _avatar, avatarPreset, ...rest } = base;
  // imagem própria (data URL ou endereço) não vira item: fica o degradê padrão
  const banner = p.banner?.startsWith("ref:") ? `banner:${p.banner.slice(4)}` : undefined;
  return {
    ...rest,
    avatarId: p.avatarId ?? `avatar:ini-${(avatarPreset ?? 0) % 6}`,
    banner: banner === `banner:${LAUNCHER_ID}:padrao` ? undefined : banner,
    frame: p.frame ? (p.frame.startsWith("frame:") ? p.frame : `frame:${p.frame}`) : undefined,
    inventory: [],
    grants: legacyGrants(unlocks, games),
  };
}

/** Junta o perfil da nuvem com o local: os campos da nuvem valem, o inventário soma. */
export function mergeCloudProfile(local: Profile, cloud: Partial<Profile>, unlocks: Record<string, Unlock>, games?: Game[]): Profile {
  const migrated = migrateProfile({ ...cloud }, unlocks, games);
  return {
    ...migrated,
    inventory: union(local.inventory, migrated.inventory),
    grants: union(local.grants, migrated.grants),
  };
}

/** Ajustes salvos antes dos campos novos de layout. */
export function migrateSettings(s: Partial<Settings> | undefined): Settings {
  const d = DEFAULT_STATE.settings;
  return {
    ...d,
    ...s,
    library: { ...d.library, ...s?.library },
    sidebar: { ...d.sidebar, ...s?.sidebar },
  };
}
