import "@fontsource-variable/unbounded";
import "@fontsource-variable/figtree";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccountProvider } from "./lib/account";
import { StoreProvider } from "./lib/state";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <AccountProvider>
        <App />
      </AccountProvider>
    </StoreProvider>
  </StrictMode>,
);
