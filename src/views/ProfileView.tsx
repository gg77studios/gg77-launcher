import { Check, PencilSimple, Plus, Storefront } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { AchievementCard, AchievementIcon } from "../components/AchievementCard";
import { ItemPreview } from "../components/ItemPreview";
import { Nick, ProfileCard } from "../components/ProfileCard";
import { fmtHours } from "../lib/format";
import { type ShopTab, useNav } from "../lib/nav";
import { useStore } from "../lib/state";
import type { ItemKind, ShopItem } from "../lib/types";
import { CoinAmount, useEquipped } from "./ShopView";
import { LauncherSettings } from "./LauncherSettings";

const MAX_SHOWCASE = 3;

export function ProfileView() {
  const [tab, setTab] = useState<"perfil" | "launcher">("perfil");
  return (
    <div className="profile">
      <div className="profile-top">
        <h1 className="page-title">Perfil</h1>
        <div className="segmented glass glass--field" role="tablist" aria-label="Seções do perfil">
          <button type="button" role="tab" aria-selected={tab === "perfil"} aria-checked={tab === "perfil"} onClick={() => setTab("perfil")}>
            Meu perfil
          </button>
          <button type="button" role="tab" aria-selected={tab === "launcher"} aria-checked={tab === "launcher"} onClick={() => setTab("launcher")}>
            Meu launcher
          </button>
        </div>
      </div>
      {tab === "perfil" ? <MyProfile /> : <LauncherSettings />}
    </div>
  );
}

function MyProfile() {
  const { state, dispatch, games, describe, gameTitle, level, xp, titleText, wallet } = useStore();
  const { go } = useNav();
  const { profile } = state;
  const [picking, setPicking] = useState(false);

  const totalSeconds = Object.values(state.stats).reduce((a, s) => a + s.seconds, 0);
  const favorite = useMemo(() => {
    const top = Object.entries(state.stats).sort((a, b) => b[1].seconds - a[1].seconds)[0];
    return top && top[1].seconds > 0 ? gameTitle(top[0]) : "nenhum ainda";
  }, [state.stats, gameTitle]);
  const unlocked = Object.entries(state.unlocks).sort((a, b) => b[1].at - a[1].at);

  const setPatch = (patch: Partial<typeof profile>) => dispatch({ type: "profile", patch });

  const toggleShowcase = (key: string) => {
    const has = profile.showcase.includes(key);
    if (has) setPatch({ showcase: profile.showcase.filter((k) => k !== key) });
    else if (profile.showcase.length < MAX_SHOWCASE) setPatch({ showcase: [...profile.showcase, key] });
  };

  return (
    <>
      <ProfileCard
        profile={profile}
        level={level}
        titleText={titleText}
        size="lg"
        live
        nickSlot={<NickEditor />}
      >
        <div className="pcard-side">
          <span className="muted">{xp} XP</span>
          <button type="button" className="btn glass glass--btn" onClick={() => go("loja")}>
            <Storefront size={16} aria-hidden /> Loja <CoinAmount n={wallet.balance} />
          </button>
        </div>
      </ProfileCard>

      <section className="panel glass builder" aria-labelledby="builder-title">
        <h2 id="builder-title">Montar o perfil</h2>
        <div className="builder-grid">
          <Slot title="Avatar" kind="avatar" tab="avatar" />
          <Slot title="Moldura" kind="frame" tab="frame" none="Sem moldura" />
          <Slot title="Efeito do avatar" kind="avatarFx" tab="fx" none="Nenhum" />
          <Slot title="Estilo do nome" kind="nameStyle" tab="nameStyle" none="Normal" />
          <Slot title="Banner" kind="banner" tab="banner" none="Degradê" wide />
          <Slot title="Efeito do banner" kind="bannerFx" tab="fx" none="Nenhum" wide />
        </div>
      </section>

      <div className="profile-grid">
        <section className="panel glass">
          <h2>Sobre</h2>
          <textarea
            className="input bio"
            placeholder="Uma frase para os amigos verem no seu perfil"
            maxLength={160}
            value={profile.bio}
            onChange={(e) => setPatch({ bio: e.target.value })}
            aria-label="Frase do perfil"
          />
          <dl className="profile-stats">
            <div>
              <dt>Horas jogadas</dt>
              <dd>{fmtHours(totalSeconds)}</dd>
            </div>
            <div>
              <dt>Jogos</dt>
              <dd>{games.length}</dd>
            </div>
            <div>
              <dt>Conquistas</dt>
              <dd>{unlocked.length}</dd>
            </div>
            <div>
              <dt>Mais jogado</dt>
              <dd className="dd-text">{favorite}</dd>
            </div>
          </dl>
        </section>

        <section className="panel glass">
          <div className="panel-head">
            <h2>Vitrine</h2>
            <button type="button" className="btn btn--ghost" onClick={() => setPicking((p) => !p)}>
              {picking ? "Pronto" : "Escolher conquistas"}
            </button>
          </div>
          <div className="showcase">
            {Array.from({ length: MAX_SHOWCASE }, (_, i) => {
              const key = profile.showcase[i];
              const u = key ? state.unlocks[key] : undefined;
              if (!u) {
                return (
                  <button key={i} type="button" className="showcase-slot" onClick={() => setPicking(true)}>
                    <Plus size={18} aria-hidden /> Espaço livre
                  </button>
                );
              }
              const d = describe(u);
              return (
                <div key={key} className="showcase-item" data-tier={d.tier}>
                  <AchievementIcon def={{ id: u.id, ...d }} unlocked pixel={d.pixel} size={64} />
                  <strong>{d.title}</strong>
                  <span>{gameTitle(u.gameId)}</span>
                </div>
              );
            })}
          </div>
          {picking && (
            <div className="pick-list">
              {unlocked.length ? (
                unlocked.map(([key, u]) => {
                  const d = describe(u);
                  const on = profile.showcase.includes(key);
                  return (
                    <button key={key} type="button" className="pick" aria-pressed={on} onClick={() => toggleShowcase(key)}>
                      <AchievementCard def={{ id: u.id, ...d }} unlock={u} pixel={d.pixel} compact />
                      {on && <Check size={16} weight="bold" aria-hidden />}
                    </button>
                  );
                })
              ) : (
                <p className="muted">Libere conquistas para colocar na vitrine.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="panel glass appearance" aria-labelledby="title-title">
        <h2 id="title-title">Título</h2>
        <p className="muted appearance-hint">Qualquer conquista liberada pode virar o título que aparece sob o seu apelido.</p>
        <div className="titles" role="radiogroup" aria-label="Título">
          <button type="button" role="radio" className="title-chip" aria-checked={!profile.title} onClick={() => setPatch({ title: undefined })}>
            Sem título
          </button>
          {unlocked.map(([key, u]) => {
            const d = describe(u);
            return (
              <button
                key={key}
                type="button"
                role="radio"
                className="title-chip"
                data-tier={d.tier}
                aria-checked={profile.title === key}
                onClick={() => setPatch({ title: key })}
                title={gameTitle(u.gameId)}
              >
                <AchievementIcon def={{ id: u.id, ...d }} unlocked pixel={d.pixel} size={22} />
                {d.title}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

/** Apelido com o estilo da loja; clicar troca por um campo de texto. */
function NickEditor() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const nick = state.profile.nickname;
  if (editing) {
    return (
      <>
        <label className="sr-only" htmlFor="nick">
          Apelido
        </label>
        <input
          id="nick"
          className="nick-input"
          autoFocus
          value={nick}
          maxLength={24}
          onChange={(e) => dispatch({ type: "profile", patch: { nickname: e.target.value } })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        />
      </>
    );
  }
  return (
    <button type="button" className="nick-edit" onClick={() => setEditing(true)} title="Trocar apelido">
      <Nick style={state.profile.nameStyle} live as="h1">
        {nick || "Jogador"}
      </Nick>
      <PencilSimple size={16} aria-hidden />
    </button>
  );
}

/** Uma peça do perfil: só os itens que o usuário tem, mais o atalho para a loja. */
function Slot({ title, kind, tab, none, wide }: { title: string; kind: ItemKind; tab: ShopTab; none?: string; wide?: boolean }) {
  const { shop, owns, equip } = useStore();
  const equipped = useEquipped();
  const { go } = useNav();
  const mine = shop.filter((i) => i.kind === kind && owns(i.id));
  const total = shop.filter((i) => i.kind === kind).length;
  const anyOn = mine.some(equipped);

  return (
    <div className="slot" data-wide={wide || undefined} data-kind={kind}>
      <h3>
        {title}
        <span className="muted">
          {mine.length}/{total}
        </span>
      </h3>
      <div className="slot-row" role="radiogroup" aria-label={title}>
        {none && (
          <button type="button" role="radio" className="slot-tile slot-tile--none" aria-checked={!anyOn} onClick={() => equip(kind, undefined)}>
            <span className="slot-art">{none}</span>
          </button>
        )}
        {mine.map((it) => (
          <SlotTile key={it.id} it={it} on={equipped(it)} onPick={() => equip(kind, it.id)} />
        ))}
        <button type="button" className="slot-tile slot-tile--shop" onClick={() => go("loja", { tab })} title="Ver mais na loja">
          <span className="slot-art">
            <Storefront size={20} aria-hidden />
          </span>
          <span className="slot-name">Mais na loja</span>
        </button>
      </div>
    </div>
  );
}

function SlotTile({ it, on, onPick }: { it: ShopItem; on: boolean; onPick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="radio"
      className="slot-tile"
      aria-checked={on}
      onClick={onPick}
      title={it.name}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="slot-art">
        <ItemPreview it={it} live={hover} size={52} />
      </span>
      <span className="slot-name">{it.name}</span>
    </button>
  );
}
