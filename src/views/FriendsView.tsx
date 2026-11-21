import { Check, CloudCheck, CloudSlash, GameController, SignOut, UserPlus, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "../components/Avatar";
import { useAccount } from "../lib/account";
import { fmtDuration, fmtRelative } from "../lib/format";
import { type FriendCard, hub, HubError, type UserPage } from "../lib/hub";
import { useStore } from "../lib/state";
import type { Profile } from "../lib/types";

const asProfile = (p: Partial<Profile>, nickname: string): Profile => ({
  bio: "",
  avatarPreset: 0,
  showcase: [],
  ...p,
  nickname: p.nickname || nickname,
});

const message = (e: unknown) => (e instanceof HubError ? e.message : "Algo deu errado.");

export function FriendsView() {
  const { user } = useAccount();
  return user ? <Friends /> : <SignIn />;
}

function SignIn() {
  const { login } = useAccount();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(nickname.trim(), password, mode);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="friends">
      <section className="panel glass signin">
        <h1>{mode === "login" ? "Entrar na conta GG77" : "Criar conta GG77"}</h1>
        <p className="muted">
          Com a conta, suas conquistas e seu tempo de jogo ficam salvos na nuvem, você vê os amigos jogando e entra nos jogos sem
          outro login. O que já está neste PC sobe junto.
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span className="field-label">Apelido</span>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]+"
              title="Letras, números ou _"
            />
          </label>
          <label className="field">
            <span className="field-label">Senha</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--accent" disabled={busy}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button type="button" className="link-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </section>
    </div>
  );
}

function presenceText(f: FriendCard, gameTitle: (id: string) => string) {
  if (f.presence.status === "playing" && f.presence.gameId) return `Jogando ${gameTitle(f.presence.gameId)}`;
  if (f.presence.status === "online") return "Online";
  return f.presence.lastSeen ? `Visto ${fmtRelative(f.presence.lastSeen)}` : "Offline";
}

function Friends() {
  const { user, sync, logout } = useAccount();
  const { gameTitle } = useStore();
  const [data, setData] = useState<{ friends: FriendCard[]; incoming: FriendCard[]; outgoing: FriendCard[] } | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [nick, setNick] = useState("");
  const [open, setOpen] = useState<UserPage | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await hub.friends());
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setNote("");
    try {
      await fn();
      if (done) setNote(done);
      await load();
    } catch (e) {
      setNote(message(e));
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = nick.trim();
    if (!n) return;
    void act(async () => {
      const r = await hub.addFriend(n);
      setNick("");
      setNote(r.status === "accepted" ? `Agora você e ${n} são amigos.` : `Pedido enviado para ${n}.`);
    });
  };

  const openProfile = (nickname: string) =>
    void hub
      .userPage(nickname)
      .then(setOpen)
      .catch((e) => setNote(message(e)));

  return (
    <div className="friends">
      <section className="panel glass friends-head">
        <div>
          <h1>Amigos</h1>
          <p className="muted sync-line">
            {sync === "offline" ? <CloudSlash size={15} aria-hidden /> : <CloudCheck size={15} aria-hidden />}
            {user?.nickname} ·{" "}
            {sync === "offline" ? "sem conexão, sincroniza quando voltar" : sync === "syncing" ? "sincronizando…" : "salvo na nuvem"}
          </p>
        </div>
        <button type="button" className="btn glass glass--btn" onClick={() => void logout()}>
          <SignOut size={16} aria-hidden /> Sair
        </button>
      </section>

      <form className="panel glass add-friend" onSubmit={add}>
        <label className="search glass glass--field">
          <UserPlus size={16} aria-hidden />
          <input placeholder="Apelido do amigo" value={nick} onChange={(e) => setNick(e.target.value)} aria-label="Apelido do amigo" />
        </label>
        <button type="submit" className="btn btn--accent">
          Adicionar
        </button>
        {note && (
          <p className="pkg-message" role="status">
            {note}
          </p>
        )}
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!!data?.incoming.length && (
        <section className="panel glass">
          <div className="panel-head">
            <h2>Pedidos de amizade</h2>
          </div>
          <ul className="friend-list">
            {data.incoming.map((f) => (
              <li key={f.nickname} className="friend">
                <Avatar profile={asProfile(f.profile, f.nickname)} size={40} />
                <span className="friend-name">
                  <strong>{f.nickname}</strong>
                  <span>quer ser seu amigo</span>
                </span>
                <button type="button" className="btn btn--accent" onClick={() => void act(() => hub.acceptFriend(f.nickname))}>
                  <Check size={16} weight="bold" aria-hidden /> Aceitar
                </button>
                <button type="button" className="btn glass glass--btn" onClick={() => void act(() => hub.removeFriend(f.nickname))}>
                  <X size={16} aria-hidden /> Recusar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel glass">
        <div className="panel-head">
          <h2>Seus amigos</h2>
          <span className="muted">{data ? data.friends.filter((f) => f.presence.status !== "offline").length : 0} online</span>
        </div>
        {!data ? (
          <p className="muted">Carregando…</p>
        ) : !data.friends.length ? (
          <p className="muted">Ninguém por aqui ainda. Adicione um amigo pelo apelido da conta GG77 dele.</p>
        ) : (
          <ul className="friend-list">
            {data.friends.map((f) => (
              <li key={f.nickname} className="friend" data-status={f.presence.status}>
                <button type="button" className="friend-open" onClick={() => openProfile(f.nickname)}>
                  <span className="friend-avatar">
                    <Avatar profile={asProfile(f.profile, f.nickname)} size={40} />
                    <i className="presence-dot" aria-hidden />
                  </span>
                  <span className="friend-name">
                    <strong>{f.nickname}</strong>
                    <span>
                      {f.presence.status === "playing" && <GameController size={14} weight="fill" aria-hidden />}{" "}
                      {presenceText(f, gameTitle)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!!data?.outgoing.length && (
          <>
            <h3 className="friends-sub">Aguardando resposta</h3>
            <ul className="friend-list">
              {data.outgoing.map((f) => (
                <li key={f.nickname} className="friend">
                  <Avatar profile={asProfile(f.profile, f.nickname)} size={32} />
                  <span className="friend-name">
                    <strong>{f.nickname}</strong>
                  </span>
                  <button type="button" className="btn glass glass--btn" onClick={() => void act(() => hub.removeFriend(f.nickname))}>
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {open && <FriendProfile page={open} onClose={() => setOpen(null)} onRemove={() => void act(() => hub.removeFriend(open.nickname)).then(() => setOpen(null))} />}
    </div>
  );
}

function FriendProfile({ page, onClose, onRemove }: { page: UserPage; onClose: () => void; onRemove: () => void }) {
  const { gameTitle, describe } = useStore();
  const byGame = new Map<string, number>();
  for (const a of page.achievements) byGame.set(a.gameId, (byGame.get(a.gameId) ?? 0) + 1);
  const recent = [...page.achievements].sort((a, b) => b.at - a.at).slice(0, 6);
  const profile = asProfile(page.profile, page.nickname);

  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="dialog friend-profile" aria-labelledby="friend-title" onClose={onClose} onCancel={onClose}>
      <div>
        <header className="friend-profile-head">
          <Avatar profile={profile} size={72} />
          <div>
            <h2 id="friend-title">{page.nickname}</h2>
            {profile.bio && <p className="muted">{profile.bio}</p>}
            <p className="muted">{page.presence.status === "playing" && page.presence.gameId ? `Jogando ${gameTitle(page.presence.gameId)}` : page.presence.status === "online" ? "Online" : "Offline"}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar" title="Fechar">
            <X size={18} aria-hidden />
          </button>
        </header>

        <dl className="stat-pills">
          {page.stats.map((s) => (
            <div key={s.gameId} className="glass">
              <dt>{gameTitle(s.gameId)}</dt>
              <dd>
                {fmtDuration(s.seconds)} · {byGame.get(s.gameId) ?? 0} conquistas
              </dd>
            </div>
          ))}
        </dl>

        {!!recent.length && (
          <>
            <h3 className="friends-sub">Conquistas recentes</h3>
            <ul className="friend-achievements">
              {recent.map((a) => {
                const d = describe(a);
                return (
                  <li key={`${a.gameId}:${a.id}`}>
                    {d.icon ? <img src={d.icon} alt="" width={36} height={36} data-pixel={d.pixel || undefined} /> : <span className="ach-dot" />}
                    <span>
                      <strong>{d.title}</strong>
                      <span className="muted">
                        {gameTitle(a.gameId)} · {fmtRelative(a.at)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {page.friendship === "friends" && (
          <button type="button" className="link-btn danger" onClick={onRemove}>
            Desfazer amizade
          </button>
        )}
      </div>
    </dialog>
  );
}
