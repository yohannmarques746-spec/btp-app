// ============================================================================
// shared/auth/resolveSession.ts
//
// Logique pure de résolution de session pour patron / co-patron / employé.
// Importée à la fois par :
//  - server/routes/auth.ts        (Express, dev local)
//  - api/auth/resolve-session.ts  (Vercel serverless function, prod)
//
// Spec : SPEC_INTEGRATED_FINAL.md — 3 rôles (PATRON / CO-PATRON / EMPLOYÉ).
// PATRON  = UUID listé dans VITE_OWNER_IDS  → full accès, jamais de team_members
// CO-PATRON = ligne dans public.app_co_owners → full accès via RLS, jamais de team_members
// EMPLOYÉ = ligne dans public.team_members (status = 'actif' avec PIN optionnel)
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolveSessionResult = {
  status: number;
  body: Record<string, unknown>;
};

export interface ResolveSessionInput {
  supabase: SupabaseClient;
  /** JWT Supabase de l'utilisateur (sans le préfixe "Bearer "). */
  token: string | null;
  /** Body JSON parsé de la requête. Peut être vide ou contenir { pin }. */
  body: { pin?: string };
  /** Liste des UUIDs autorisés en tant que patrons (issue de VITE_OWNER_IDS). */
  ownerIds: string[];
}

const PIN_RE = /^\d{6}$/;

/**
 * Résout la session d'un utilisateur authentifié Supabase.
 * Pure : ne dépend ni d'Express ni du runtime Node spécifique.
 */
export async function resolveSession(
  input: ResolveSessionInput,
): Promise<ResolveSessionResult> {
  const { supabase, token, body, ownerIds } = input;
  const ownerId = ownerIds[0] ?? "";

  if (!token) {
    return { status: 401, body: { error: "Token manquant" } };
  }

  if (!ownerId) {
    return { status: 500, body: { error: "VITE_OWNER_IDS non configuré" } };
  }

  // 1. Authentifier le token JWT auprès de Supabase
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { status: 401, body: { error: "Token invalide" } };
  }

  // 2. PATRON — UUID dans VITE_OWNER_IDS → bypass total
  if (ownerIds.includes(user.id)) {
    return { status: 200, body: { type: "owner" } };
  }

  // 3. CO-PATRON — entry dans app_co_owners → full accès aussi
  const { data: coOwner } = await supabase
    .from("app_co_owners")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("co_owner_id", user.id)
    .maybeSingle();
  if (coOwner) {
    return { status: 200, body: { type: "owner" } };
  }

  // 4. EMPLOYÉ — lookup via RPC (RLS team_members : user_id = patron, la ligne n’est pas visible en SELECT direct)
  const { data: memberRpcData, error: memberRpcError } = await supabase.rpc(
    "get_member_by_auth_user",
    { p_auth_user_id: user.id, p_owner_id: ownerId },
  );

  if (memberRpcError) {
    console.error("[resolveSession] get_member_by_auth_user:", memberRpcError);
    return { status: 500, body: { error: "Erreur serveur" } };
  }

  const memberRows = Array.isArray(memberRpcData)
    ? memberRpcData
    : memberRpcData
      ? [memberRpcData]
      : [];
  const memberRow = memberRows[0] as
    | {
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
        permissions: unknown;
        has_pin: boolean;
      }
    | undefined;

  const member = memberRow
    ? {
        id: memberRow.id,
        name: memberRow.name,
        email: memberRow.email,
        role: memberRow.role,
        status: memberRow.status,
        permissions: memberRow.permissions,
        has_pin: memberRow.has_pin,
      }
    : null;

  // 4a. Première connexion — créer la demande d'adhésion (RPC SECURITY DEFINER : l'INSERT direct viole la RLS team_members)
  if (!member) {
    const email = user.email ?? "";
    const name =
      (user.user_metadata?.full_name as string | undefined) ?? email;
    const { data: newMemberId, error: rpcError } = await supabase.rpc(
      "register_pending_team_member",
      {
        p_owner_id: ownerId,
        p_email: email,
        p_name: name,
      },
    );

    if (rpcError) {
      console.error("[resolveSession] register_pending_team_member:", rpcError);
      const msg = rpcError.message ?? "";
      if (msg.includes("INVALID_OWNER")) {
        return { status: 403, body: { error: "Entreprise non reconnue." } };
      }
      if (msg.includes("NOT_AUTHENTICATED")) {
        return { status: 401, body: { error: "Token invalide" } };
      }
      return { status: 500, body: { error: "Erreur serveur" } };
    }

    const memberId =
      typeof newMemberId === "string"
        ? newMemberId
        : newMemberId === null || newMemberId === undefined
          ? undefined
          : String(newMemberId);

    return {
      status: 200,
      body: {
        type: "employee",
        status: "en_attente_confirmation",
        isNew: true,
        ...(memberId && { memberId }),
      },
    };
  }

  // 4b. Membre existant — gérer les statuts non-actifs
  const status = member.status as string;

  if (status === "en_attente_confirmation") {
    return { status: 200, body: { type: "employee", status } };
  }

  if (status === "bloqué" || status === "bloque") {
    return { status: 200, body: { type: "employee", status: "bloqué" } };
  }

  if (status === "refusé" || status === "refuse") {
    return { status: 200, body: { type: "employee", status: "refusé" } };
  }

  if (status !== "actif") {
    return { status: 200, body: { type: "employee", status } };
  }

  // 4c. Membre actif — vérifier PIN si présent
  const requiresPin = !!member.has_pin;
  const pin = body.pin;

  if (requiresPin && (!pin || !PIN_RE.test(pin))) {
    return {
      status: 200,
      body: { type: "employee", status: "actif", requiresPin: true },
    };
  }

  // 4d. Créer la session membre via RPC SECURITY DEFINER
  const { data: sessionData, error: sessionError } = await supabase.rpc(
    "create_member_session_email",
    {
      p_member_id: member.id,
      p_owner_id: ownerId,
      p_pin: pin ?? null,
    },
  );

  if (sessionError) {
    const msg = sessionError.message ?? "";
    if (msg.includes("PIN_REQUIRED")) {
      return {
        status: 200,
        body: { type: "employee", status: "actif", requiresPin: true },
      };
    }
    if (msg.includes("PIN_INCORRECT")) {
      return {
        status: 401,
        body: { error: "PIN_INCORRECT", message: "PIN incorrect" },
      };
    }
    console.error("[resolveSession] session RPC error:", sessionError);
    return { status: 500, body: { error: "Erreur serveur" } };
  }

  const row = Array.isArray(sessionData) ? sessionData[0] : sessionData;
  if (!row) {
    return { status: 500, body: { error: "Erreur création session" } };
  }

  const r = row as Record<string, unknown>;
  return {
    status: 200,
    body: {
      type: "employee",
      status: "actif",
      token: r.session_token,
      memberId: member.id,
      name: r.member_name,
      role: r.member_role,
      permissions: r.member_permissions,
    },
  };
}

/** Helper utilisé par les deux endpoints pour parser VITE_OWNER_IDS. */
export function parseOwnerIds(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
