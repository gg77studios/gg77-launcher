import { Component, type ReactNode } from "react";

/**
 * Erro de renderização em qualquer tela deixava a janela em branco, sem saída. Aqui o launcher
 * mostra o que houve e um botão para recarregar. Fica fora do `.app`, então não depende do tema.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[gg77] erro na interface:", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: 14,
          padding: 32,
          textAlign: "center",
          background: "#0e1014",
          color: "#e8eaf0",
          font: '15px/1.5 "Figtree Variable", system-ui, sans-serif',
        }}
      >
        <strong style={{ fontSize: 20 }}>O launcher encontrou um erro</strong>
        <span style={{ maxWidth: 460, opacity: 0.75 }}>Seus dados estão salvos. Recarregue para continuar.</span>
        <code style={{ maxWidth: 560, opacity: 0.55, fontSize: 12, overflowWrap: "anywhere" }}>{error.message}</code>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 6,
            padding: "10px 22px",
            border: 0,
            borderRadius: 12,
            background: "#c8f560",
            color: "#12160a",
            font: "inherit",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Recarregar
        </button>
      </div>
    );
  }
}
