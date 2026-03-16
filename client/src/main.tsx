import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// #region agent log
fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'main-global-debug-1',hypothesisId:'H10',location:'client/src/main.tsx:boot',message:'main boot',data:{hasCrypto:typeof crypto!=='undefined',randomUUIDType:typeof crypto!=='undefined'?typeof (crypto as {randomUUID?:unknown}).randomUUID:'no-crypto'},timestamp:Date.now()})}).catch(()=>{});
window.addEventListener("error", (event) => {
  fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'main-global-debug-1',hypothesisId:'H11',location:'client/src/main.tsx:error-listener',message:'window error',data:{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno},timestamp:Date.now()})}).catch(()=>{});
});
window.addEventListener("unhandledrejection", (event) => {
  fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'main-global-debug-1',hypothesisId:'H12',location:'client/src/main.tsx:rejection-listener',message:'unhandled rejection',data:{reason:String(event.reason)},timestamp:Date.now()})}).catch(()=>{});
});

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

  fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'main-global-debug-1',hypothesisId:'H13',location:'client/src/main.tsx:randomuuid-polyfill',message:'crypto.randomUUID polyfilled',data:{hadCrypto:typeof globalThis.crypto!=='undefined'},timestamp:Date.now()})}).catch(()=>{});
}
// #endregion

createRoot(document.getElementById("root")!).render(<App />);
