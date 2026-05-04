// ============================================================================
// api/auth/resolve-session.ts
//
// Vercel serverless function — endpoint POST /api/auth/resolve-session.
// Délègue toute la logique à shared/auth/resolveSession.ts (même code que la
// route Express server/routes/auth.ts).
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";
import {
  parseOwnerIds,
  resolveSession,
} from "../../shared/auth/resolveSession";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const OWNER_IDS = parseOwnerIds(process.env.VITE_OWNER_IDS);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Variables Supabase manquantes" }));
    return;
  }

  const auth = req.headers["authorization"] as string | undefined;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  let body: { pin?: string } = {};
  try {
    const raw = await readBody(req);
    if (raw) body = JSON.parse(raw) as { pin?: string };
  } catch {
    // body vide ou non-JSON → ok, on traite comme {}
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { status, body: responseBody } = await resolveSession({
    supabase,
    token,
    body,
    ownerIds: OWNER_IDS,
  });

  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(responseBody));
}
