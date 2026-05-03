import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ─── Dev-only React Refresh preamble check ────────────────────────────────
// `@vitejs/plugin-react` injects an inline preamble that sets this flag.
// If CSP blocks the inline script, the flag is missing and Fast Refresh fails
// with: "@vitejs/plugin-react can't detect preamble. Something is wrong."
// This log helps confirm the preamble executed. Tree-shaken in production.
if (import.meta.env.DEV) {
  const preambleInstalled = Boolean(
    (window as Window & { __vite_plugin_react_preamble_installed__?: boolean })
      .__vite_plugin_react_preamble_installed__,
  );
  // eslint-disable-next-line no-console
  console.log(
    preambleInstalled
      ? "✅ React Refresh initialized"
      : "❌ React Refresh NOT detected",
  );
}

// #region agent log
fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "a13edd",
  },
  body: JSON.stringify({
    sessionId: "a13edd",
    runId: "run-1",
    hypothesisId: "H5",
    location: "client/src/main.tsx:module-init",
    message: "Client entry preamble state",
    data: {
      preambleInstalled: Boolean(
        (window as Window & { __vite_plugin_react_preamble_installed__?: boolean })
          .__vite_plugin_react_preamble_installed__,
      ),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

if (
  typeof globalThis.crypto === "undefined" ||
  typeof (globalThis.crypto as { randomUUID?: unknown }).randomUUID !== "function"
) {
  const fallbackRandomUUID = (): `${string}-${string}-${string}-${string}-${string}` =>
    `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 14)}`;

  if (typeof globalThis.crypto === "undefined") {
    (globalThis as typeof globalThis & { crypto: Crypto }).crypto = {
      randomUUID: fallbackRandomUUID,
    } as Crypto;
  } else {
    (globalThis.crypto as Crypto & { randomUUID: () => string }).randomUUID = fallbackRandomUUID;
  }
}

createRoot(document.getElementById("root")!).render(<App />);
