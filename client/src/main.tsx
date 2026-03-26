import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
