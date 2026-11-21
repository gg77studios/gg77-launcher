import { ImageSquare, Trash } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { imageToDataUrl } from "../lib/platform";

type Props = {
  label: string;
  hint: string;
  value?: string;
  maxW: number;
  maxH: number;
  aspect: string;
  onChange: (value: string | undefined) => void;
};

/** Escolha de imagem por arquivo do computador ou por endereço da web. */
export function ImageField({ label, hint, value, maxW, maxH, aspect, onChange }: Props) {
  const id = useId();
  const [error, setError] = useState("");
  const isUrl = value && !value.startsWith("data:");
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="imgfield">
        <div className="imgfield-preview" style={{ aspectRatio: aspect, backgroundImage: value ? `url(${value})` : undefined }}>
          {!value && <ImageSquare size={26} aria-hidden />}
        </div>
        <div className="imgfield-actions">
          <label className="btn btn--ghost" htmlFor={id}>
            Escolher arquivo
          </label>
          <input
            id={id}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setError("");
                onChange(await imageToDataUrl(file, maxW, maxH));
              } catch {
                setError("Não deu para ler essa imagem.");
              }
              e.target.value = "";
            }}
          />
          <input
            className="input"
            type="url"
            placeholder="ou cole o endereço de uma imagem"
            aria-label={`${label}: endereço da imagem`}
            value={isUrl ? value : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
          {value && (
            <button type="button" className="btn btn--ghost btn--danger" onClick={() => onChange(undefined)}>
              <Trash size={14} aria-hidden /> Remover
            </button>
          )}
        </div>
      </div>
      <span className="field-hint">{error || hint}</span>
    </div>
  );
}
