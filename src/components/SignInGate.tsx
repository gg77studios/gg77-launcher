import { CloudArrowUp, GameController, UsersThree } from "@phosphor-icons/react";
import { useState } from "react";
import { useAccount } from "../lib/account";
import { HubError } from "../lib/hub";

/** Primeira tela do launcher: entrar ou criar a conta GG77. Conta salva no PC pula esta tela. */
export function SignInGate() {
  const { login } = useAccount();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setConfirm("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirm) {
      setError("As senhas não são iguais.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(nickname.trim(), password, mode);
    } catch (err) {
      setError(err instanceof HubError ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <section className="gate-card glass" aria-labelledby="gate-title">
        <div className="gate-brand">
          <img src="/icon.png" alt="" width={44} height={44} />
          <span className="logo-mark">GG77</span>
        </div>

        <div className="gate-tabs" role="tablist" aria-label="Entrar ou criar conta">
          <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchMode("login")}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchMode("register")}>
            Criar conta
          </button>
        </div>

        <h1 id="gate-title">{isLogin ? "Bem-vindo de volta" : "Sua conta GG77"}</h1>

        <form onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span className="field-label">Apelido</span>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]+"
              title="3 a 20 letras, números ou _"
            />
            {!isLogin && <span className="field-hint">É o nome que seus amigos vão ver. Letras, números ou _.</span>}
          </label>
          <label className="field">
            <span className="field-label">Senha</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
            />
          </label>
          {!isLogin && (
            <label className="field">
              <span className="field-label">Repita a senha</span>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--accent gate-submit" disabled={busy}>
            {busy ? "Aguarde…" : isLogin ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <ul className="gate-perks">
          <li>
            <CloudArrowUp size={18} aria-hidden /> Conquistas e tempo de jogo salvos na nuvem
          </li>
          <li>
            <UsersThree size={18} aria-hidden /> Veja quem dos amigos está jogando
          </li>
          <li>
            <GameController size={18} aria-hidden /> Entre nos jogos sem outro login
          </li>
        </ul>
      </section>
    </div>
  );
}
