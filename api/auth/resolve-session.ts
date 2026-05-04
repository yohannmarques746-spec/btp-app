import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const OWNER_IDS = (process.env.VITE_OWNER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const OWNER_ID = OWNER_IDS[0] ?? "";
const PIN_RE = /^\d{6}$/;

function isOwner(userId: string): boolean {
  return OWNER_IDS.includes(userId);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
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

  const json = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  const auth = req.headers["authorization"] as string | undefined;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    json(401, { error: "Token manquant" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    json(500, { error: "Variables Supabase manquantes" });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    json(401, { error: "Token invalide" });
    return;
  }

  if (!OWNER_ID) {
    json(500, { error: "VITE_OWNER_IDS non configuré" });
    return;
  }

  let body: { pin?: string } = {};
  try {
    const raw = await readBody(req);
    if (raw) body = JSON.parse(raw) as { pin?: string };
  } catch {
    // body vide ou non-JSON → ok
  }
  const { pin } = body;

  if (isOwner(user.id)) {
    json(200, { type: "owner" });
    return;
  }

  const { data: coOwner } = await supabase
    .from("app_co_owners")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("co_owner_id", user.id)
    .maybeSingle();

  if (coOwner) {
    json(200, { type: "owner" });
    return;
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, name, email, role, status, permissions, pin_hash")
    .eq("auth_user_id", user.id)
    .eq("user_id", OWNER_ID)
    .maybeSingle();

  if (memberError) {
    console.error("[resolve-session] DB error:", memberError);
    json(500, { error: "Erreur serveur" });
    return;
  }

  if (!member) {
    const email = user.email ?? "";
    const name = (user.user_metadata?.full_name as string | undefined) ?? email;

    const { data: newMember, error: createError } = await supabase
      .from("team_members")
      .insert({
        user_id: OWNER_ID,
        auth_user_id: user.id,
        email,
        name,
        role: "employee",
        status: "en_attente_confirmation",
        permissions: {
          crm: false,
          planning: false,
          devis: false,
          factures: false,
          chantiers: false,
          clients: false,
          dashboard: false,
        },
      })
      .select("id")
      .single();

    if (createError) {
      console.error("[resolve-session] create error:", createError);
      json(500, { error: "Erreur serveur" });
      return;
    }

    json(200, {
      type: "employee",
      status: "en_attente_confirmation",
      isNew: true,
      memberId: newMember?.id,
    });
    return;
  }

  const status = member.status as string;

  if (status === "en_attente_confirmation") {
    json(200, { type: "employee", status });
    return;
  }

  if (status === "bloqué" || status === "bloque") {
    json(200, { type: "employee", status: "bloqué" });
    return;
  }

  if (status === "refusé" || status === "refuse") {
    json(200, { type: "employee", status: "refusé" });
    return;
  }

  if (status !== "actif") {
    json(200, { type: "employee", status });
    return;
  }

  const requiresPin = !!member.pin_hash;

  if (requiresPin && (!pin || !PIN_RE.test(pin))) {
    json(200, { type: "employee", status: "actif", requiresPin: true });
    return;
  }

  const { data: sessionData, error: sessionError } = await supabase.rpc(
    "create_member_session_email",
    {
      p_member_id: member.id,
      p_owner_id: OWNER_ID,
      p_pin: pin ?? null,
    },
  );

  if (sessionError) {
    const msg = sessionError.message ?? "";
    if (msg.includes("PIN_REQUIRED")) {
      json(200, { type: "employee", status: "actif", requiresPin: true });
    } else if (msg.includes("PIN_INCORRECT")) {
      json(401, { error: "PIN_INCORRECT", message: "PIN incorrect" });
    } else {
      console.error("[resolve-session] session RPC error:", sessionError);
      json(500, { error: "Erreur serveur" });
    }
    return;
  }

  const row = Array.isArray(sessionData) ? sessionData[0] : sessionData;
  if (!row) {
    json(500, { error: "Erreur création session" });
    return;
  }

  const r = row as Record<string, unknown>;
  json(200, {
    type: "employee",
    status: "actif",
    token: r.session_token,
    memberId: member.id,
    name: r.member_name,
    role: r.member_role,
    permissions: r.member_permissions,
  });
}
