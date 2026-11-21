import { X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { slugify } from "../lib/catalog";
import type { Game } from "../lib/types";
import { ImageField } from "./ImageField";

type Props = {
  /** jogo existente para editar; vazio para adicionar */
  game?: Game;
  existingIds: string[];
  onClose: () => void;
  onSave: (game: Game) => void;
};

export function GameDialog({ game, existingIds, onClose, onSave }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(game?.title ?? "");
  const [url, setUrl] = useState(game?.url ?? "https://");
  const [cover, setCover] = useState(game?.cover);
  const [banner, setBanner] = useState(game?.banner);
  const [error, setError] = useState("");
  const isCatalog = !!game && !game.custom;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Dê um nome para o jogo.");
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      return setError("O endereço precisa começar com http:// ou https://");
    }
    let id = game?.id ?? slugify(title);
    if (!game) {
      let n = 2;
      const base = id;
      while (existingIds.includes(id)) id = `${base}-${n++}`;
    }
    onSave({
      id,
      title: title.trim(),
      url,
      cover,
      banner,
      tint: game?.tint ?? "#1e222a",
      achievements: game?.achievements ?? [],
      custom: game ? game.custom : true,
      icon: game?.icon,
      tagline: game?.tagline,
    });
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-head">
          <h2>{game ? `Editar ${game.title}` : "Adicionar jogo"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <label className="field">
          <span className="field-label">Nome</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={60} />
        </label>

        <label className="field">
          <span className="field-label">Endereço do jogo</span>
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isCatalog}
            aria-describedby="url-hint"
          />
          <span className="field-hint" id="url-hint">
            {isCatalog ? "Jogos do catálogo usam o endereço oficial." : "O site onde o jogo está publicado. Ele abre numa janela própria."}
          </span>
        </label>

        <div className="dialog-images">
          <ImageField label="Capa" hint="Vertical, 2:3" value={cover} onChange={setCover} maxW={600} maxH={900} aspect="2 / 3" />
          <ImageField label="Banner" hint="Horizontal, 16:9" value={banner} onChange={setBanner} maxW={1600} maxH={900} aspect="16 / 9" />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--accent">
            {game ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
