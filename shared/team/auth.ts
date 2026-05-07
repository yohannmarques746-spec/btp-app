import { getSupabaseServer } from "../auth/supabaseFactory.js";
import { unwrapRpc } from "../auth/serverlessHelpers.js";

const PIN_RE = /^\d{6}$/;

export async function loginPin(
  pin: string,
  ownerId: string,
): Promise<{ status: number; body: object }> {
  if (!PIN_RE.test(pin)) {
    return {
      status: 401,
      body: { error: "PIN_INCORRECT", message: "Code incorrect. Le PIN doit être 6 chiffres." },
    };
  }

  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase.rpc("login_member_pin", {
      input_pin: pin,
      p_owner_id: ownerId,
    });
    if (error) {
      console.error("[shared/team/auth.loginPin] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    const row = unwrapRpc(data as Record<string, unknown>[] | null);
    if (!row) {
      return {
        status: 401,
        body: { error: "PIN_INCORRECT", message: "Code incorrect ou compte inactif" },
      };
    }
    return {
      status: 200,
      body: {
        token: row.session_token,
        memberId: row.member_id,
        name: row.member_name,
      },
    };
  } catch (err) {
    console.error("[shared/team/auth.loginPin]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function loginInvite(
  inviteToken: string,
  pin: string,
): Promise<{ status: number; body: object }> {
  if (!PIN_RE.test(pin)) {
    return {
      status: 401,
      body: { error: "PIN_INCORRECT", message: "Le PIN doit être 6 chiffres." },
    };
  }

  const supabase = getSupabaseServer();
  try {
    const { data: invData, error: invError } = await supabase
      .from("team_invitations")
      .select("user_id, team_member_id, expires_at, used")
      .eq("token", inviteToken)
      .maybeSingle();

    if (invError) {
      console.error("[shared/team/auth.loginInvite] DB error:", invError);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    if (!invData) {
      return {
        status: 404,
        body: { error: "INVITE_INVALID", message: "Lien d'invitation invalide ou expiré" },
      };
    }
    if ((invData as Record<string, unknown>).used) {
      return {
        status: 410,
        body: { error: "INVITE_USED", message: "Ce lien d'invitation a déjà été utilisé" },
      };
    }
    if (new Date((invData as Record<string, unknown>).expires_at as string) < new Date()) {
      return {
        status: 410,
        body: {
          error: "INVITE_EXPIRED",
          message: "Lien d'invitation expiré. Demandez une nouvelle invitation.",
        },
      };
    }

    const ownerId = (invData as Record<string, unknown>).user_id as string;
    const { data: loginData, error: loginError } = await supabase.rpc("login_member_pin", {
      input_pin: pin,
      p_owner_id: ownerId,
    });
    if (loginError) {
      console.error("[shared/team/auth.loginInvite] RPC error:", loginError);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    const loginRow = unwrapRpc(loginData as Record<string, unknown>[] | null);
    if (!loginRow) {
      return { status: 401, body: { error: "PIN_INCORRECT", message: "Code PIN incorrect" } };
    }

    const memberId = loginRow.member_id as string;
    const teamMemberId = (invData as Record<string, unknown>).team_member_id as string | null;
    if (teamMemberId && memberId !== teamMemberId) {
      return {
        status: 403,
        body: { error: "PIN_INCORRECT", message: "Code PIN incorrect pour ce lien d'invitation" },
      };
    }

    await supabase
      .from("team_invitations")
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq("token", inviteToken);

    return {
      status: 200,
      body: {
        token: loginRow.session_token,
        memberId,
        name: loginRow.member_name,
      },
    };
  } catch (err) {
    console.error("[shared/team/auth.loginInvite]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function logoutMember(token: string): Promise<{ status: number; body: object }> {
  const supabase = getSupabaseServer();
  try {
    await supabase.rpc("logout_member", { p_token: token });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/auth.logoutMember]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function getMemberSession(token: string): Promise<{ status: number; body: object }> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase.rpc("get_member_session", { p_token: token });
    if (error) {
      console.error("[shared/team/auth.getMemberSession] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    const row = unwrapRpc(data as Record<string, unknown>[] | null);
    if (!row) {
      return {
        status: 401,
        body: { error: "SESSION_EXPIRED", message: "Session expirée ou invalide" },
      };
    }
    return {
      status: 200,
      body: {
        memberId: row.member_id,
        name: row.member_name,
        permissions: row.member_permissions,
        ownerId: row.owner_id,
        assignedChantiers: (row.chantiers as unknown[]) ?? [],
      },
    };
  } catch (err) {
    console.error("[shared/team/auth.getMemberSession]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}
