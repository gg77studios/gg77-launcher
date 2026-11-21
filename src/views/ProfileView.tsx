import { Camera, Check, ImageSquare, LockSimple, Plus } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";
import { AchievementCard, AchievementIcon } from "../components/AchievementCard";
import { Avatar } from "../components/Avatar";
import { BannerPicker } from "../components/BannerPicker";
import { AVATAR_PRESETS } from "../lib/catalog";
import { fmtHours } from "../lib/format";
import { imageToDataUrl } from "../lib/platform";
import { useStore } from "../lib/state";

const MAX_SHOWCASE = 3;

export function ProfileView() {
  const { state, dispatch, games, describe, gameTitle, level, xp, banners, titleText } = useStore();
  const { profile } = state;
  const avatarInput = useId();
  const [picking, setPicking] = useState(false);
  const [choosingBanner, setChoosingBanner] = useState(false);

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
    <div className="profile">
      <div className="profile-banner">
        <button type="button" className="btn glass glass--btn profile-banner-btn" onClick={() => setChoosingBanner(true)}>
          <ImageSquare size={16} aria-hidden /> Trocar banner
          <span className="banner-count">
            {banners.filter((b) => b.unlocked).length}/{banners.length}
          </span>
        </button>
      </div>
      {choosingBanner && <BannerPicker onClose={() => setChoosingBanner(false)} />}

      <div className="profile-head glass">
        <div className="profile-avatar">
          <Avatar profile={profile} size={132} />
          <label className="avatar-edit" htmlFor={avatarInput} title="Enviar foto">
            <Camera size={18} weight="fill" aria-hidden />
            <span className="sr-only">Enviar foto de avatar</span>
          </label>
          <input
            id={avatarInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPatch({ avatar: await imageToDataUrl(f, 320, 320) });
              e.target.value = "";
            }}
          />
        </div>
        <div className="profile-id">
          <label className="sr-only" htmlFor="nick">
            Apelido
          </label>
          <input id="nick" className="nick-input" value={profile.nickname} maxLength={24} onChange={(e) => setPatch({ nickname: e.target.value })} />
          {titleText && <div className="profile-title">{titleText}</div>}
          <div className="profile-level">
            <span className="level-badge level-badge--sm">{level}</span>
            Nível {level}, {xp} XP
          </div>
        </div>
        <div className="presets" role="group" aria-label="Avatares prontos">
          {AVATAR_PRESETS.map((p, i) => (
            <button
              key={p.bg}
              type="button"
              className="preset"
              style={{ background: p.bg }}
              aria-pressed={!profile.avatar && profile.avatarPreset === i}
              aria-label={`Avatar de cor ${i + 1}`}
              onClick={() => setPatch({ avatar: undefined, avatarPreset: i })}
            >
              {!profile.avatar && profile.avatarPreset === i && <Check size={14} weight="bold" color={p.fg} />}
            </button>
          ))}
        </div>
      </div>

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

      <Appearance />
    </div>
  );
}

/** Peças para montar o perfil: moldura do avatar e título sob o apelido. */
function Appearance() {
  const { state, dispatch, frames, describe, gameTitle } = useStore();
  const { profile } = state;
  const unlocked = Object.entries(state.unlocks).sort((a, b) => b[1].at - a[1].at);
  const setPatch = (patch: Partial<typeof profile>) => dispatch({ type: "profile", patch });

  return (
    <section className="panel glass appearance" aria-labelledby="app-title">
      <h2 id="app-title">Aparência do perfil</h2>
      <div className="appearance-grid">
        <div>
          <h3>Moldura do avatar</h3>
          <div className="frames" role="radiogroup" aria-label="Moldura do avatar">
            <button type="button" role="radio" className="frame-tile" aria-checked={!profile.frame} onClick={() => setPatch({ frame: undefined })}>
              <Avatar profile={profile} size={56} frame={null} />
              <strong>Sem moldura</strong>
            </button>
            {frames.map(({ def, unlocked: free, requirement }) => (
              <button
                key={def.id}
                type="button"
                role="radio"
                className="frame-tile"
                aria-checked={profile.frame === def.id}
                disabled={!free}
                onClick={() => setPatch({ frame: def.id })}
                title={free ? def.name : `Libere com: ${requirement}`}
              >
                <Avatar profile={profile} size={56} frame={def.id} />
                <strong>{def.name}</strong>
                {!free && (
                  <span>
                    <LockSimple size={11} weight="bold" aria-hidden /> {requirement}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3>Título</h3>
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
        </div>
      </div>
    </section>
  );
}
