import "@fontsource-variable/unbounded";
import "@fontsource-variable/figtree";
import "@fontsource-variable/nunito";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/pixelify-sans";
import "./styles.css";
import "./loja.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AccountProvider } from "./lib/account";
import { StoreProvider } from "./lib/state";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <AccountProvider>
          <App />
        </AccountProvider>
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
);
