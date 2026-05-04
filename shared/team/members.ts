import { getSupabaseServer } from "../auth/supabaseFactory";
import { unwrapRpc } from "../auth/serverlessHelpers";

const PIN_RE = /^\d{6}$/;

export async function listMembers(
  ownerId: string,
  status?: string,
): Promise<{ status: number; body: unknown }> {
  const supabase = getSupabaseServer();
  try {
    let query = supabase
      .from("team_members")
      .select("id, name, email, role, status, permissions, auth_user_id, confirmed_at, created_at, pin_hash")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) return { status: 500, body: { error: "Erreur serveur" } };

    const members = (data ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      has_pin: !!m.pin_hash,
      pin_hash: undefined,
    }));
    return { status: 200, body: members };
  } catch (err) {
    console.error("[shared/team/members.listMembers]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function getMember(
  id: string,
  ownerId: string,
  isOwner: boolean,
): Promise<{ status: number; body: unknown }> {
  const supabase = getSupabaseServer();
  try {
    const { data: member, error } = await supabase
      .from("team_members")
      .select("id, name, email, role, status, permissions, auth_user_id, confirmed_at, created_at, pin_hash")
      .eq("id", id)
      .eq("user_id", ownerId)
      .maybeSingle();

    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    if (!member) return { status: 404, body: { error: "Membre introuvable" } };

    const m = member as Record<string, unknown>;
    if (!isOwner && m.role === "co_owner") {
      return { status: 403, body: { error: "Accès refusé" } };
    }

    return { status: 200, body: { ...m, has_pin: !!m.pin_hash, pin_hash: undefined } };
  } catch (err) {
    console.error("[shared/team/members.getMember]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function createMember(
  ownerId: string,
  name: string,
  pin: string,
  role: string,
): Promise<{ status: number; body: unknown }> {
  if (!PIN_RE.test(pin)) {
    return { status: 400, body: { error: "Le PIN doit être 6 chiffres" } };
  }
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase.rpc("create_team_member_pin", {
      p_owner_id: ownerId,
      p_name: name,
      p_role: role,
      p_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) {
        return { status: 409, body: { error: "Ce PIN est déjà utilisé par un autre membre" } };
      }
      console.error("[shared/team/members.createMember] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    return { status: 201, body: unwrapRpc(data as Record<string, unknown>[] | null) };
  } catch (err) {
    console.error("[shared/team/members.createMember]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function updateMemberPin(
  id: string,
  ownerId: string,
  pin: string,
): Promise<{ status: number; body: object }> {
  if (!PIN_RE.test(pin)) {
    return { status: 400, body: { error: "Le PIN doit être 6 chiffres" } };
  }
  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase.rpc("update_member_pin", {
      p_member_id: id,
      p_owner_id: ownerId,
      p_new_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) {
        return { status: 409, body: { error: "Ce PIN est déjà utilisé par un autre membre" } };
      }
      console.error("[shared/team/members.updateMemberPin] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.updateMemberPin]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function confirmMember(
  id: string,
  ownerId: string,
  role: string,
  pin: string | null,
): Promise<{ status: number; body: object }> {
  if (pin && !PIN_RE.test(pin)) {
    return { status: 400, body: { error: "Le PIN doit être 6 chiffres" } };
  }
  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase.rpc("confirm_team_member", {
      p_member_id: id,
      p_owner_id: ownerId,
      p_role: role,
      p_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) {
        return { status: 409, body: { error: "Ce PIN est déjà utilisé par un autre membre" } };
      }
      console.error("[shared/team/members.confirmMember] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.confirmMember]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function refuseMember(
  id: string,
  ownerId: string,
): Promise<{ status: number; body: object }> {
  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase
      .from("team_members")
      .update({ status: "refusé" })
      .eq("id", id)
      .eq("user_id", ownerId);
    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.refuseMember]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function updatePermissions(
  id: string,
  ownerId: string,
  permissions: object,
  isOwner: boolean,
): Promise<{ status: number; body: object }> {
  const supabase = getSupabaseServer();
  try {
    if (!isOwner) {
      const { data: member } = await supabase
        .from("team_members")
        .select("role")
        .eq("id", id)
        .eq("user_id", ownerId)
        .maybeSingle();
      if (member && (member as Record<string, unknown>).role === "co_owner") {
        return { status: 403, body: { error: "Vous ne pouvez modifier que les employés" } };
      }
    }

    const { error } = await supabase
      .from("team_members")
      .update({ permissions })
      .eq("id", id)
      .eq("user_id", ownerId);
    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.updatePermissions]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

const ALLOWED_STATUSES = ["actif", "bloqué", "supprimé"];

export async function updateStatus(
  id: string,
  ownerId: string,
  status: string,
  isOwner: boolean,
): Promise<{ status: number; body: object }> {
  if (!ALLOWED_STATUSES.includes(status)) {
    return { status: 400, body: { error: "Status invalide" } };
  }
  const supabase = getSupabaseServer();
  try {
    if (!isOwner) {
      const { data: member } = await supabase
        .from("team_members")
        .select("role")
        .eq("id", id)
        .eq("user_id", ownerId)
        .maybeSingle();
      if (member && (member as Record<string, unknown>).role === "co_owner") {
        return { status: 403, body: { error: "Vous ne pouvez modifier que les employés" } };
      }
    }

    const { error } = await supabase
      .from("team_members")
      .update({ status })
      .eq("id", id)
      .eq("user_id", ownerId);
    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.updateStatus]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function deleteMember(
  id: string,
  ownerId: string,
): Promise<{ status: number; body: object }> {
  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id)
      .eq("user_id", ownerId);
    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.deleteMember]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function setOwnPin(
  memberToken: string,
  pin: string,
  oldPin: string | null,
): Promise<{ status: number; body: object }> {
  if (!PIN_RE.test(pin)) {
    return { status: 400, body: { error: "PIN invalide — 6 chiffres requis" } };
  }
  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase.rpc("set_member_pin_self", {
      p_token: memberToken,
      p_new_pin: pin,
      p_old_pin: oldPin,
    });
    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("UNAUTHORIZED")) return { status: 401, body: { error: "Session expirée" } };
      if (msg.includes("OLD_PIN_REQUIRED")) return { status: 400, body: { error: "Ancien PIN requis pour le modifier" } };
      if (msg.includes("OLD_PIN_INCORRECT")) return { status: 401, body: { error: "Ancien PIN incorrect" } };
      if (msg.includes("PIN_DUPLICATE")) return { status: 409, body: { error: "Ce PIN est déjà utilisé par un autre membre" } };
      console.error("[shared/team/members.setOwnPin] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/members.setOwnPin]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}
