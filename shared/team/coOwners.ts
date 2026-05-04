import { getSupabaseServer } from "../auth/supabaseFactory";

export async function listCoOwners(ownerId: string): Promise<{ status: number; body: unknown }> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase
      .from("app_co_owners")
      .select("id, co_owner_id, co_owner_email, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true });
    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    return { status: 200, body: data ?? [] };
  } catch (err) {
    console.error("[shared/team/coOwners.listCoOwners]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function addCoOwner(
  ownerId: string,
  email: string,
  requestingUserEmail: string,
): Promise<{ status: number; body: object }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (requestingUserEmail === normalizedEmail) {
    return { status: 400, body: { error: "Vous ne pouvez pas vous ajouter comme co-patron" } };
  }

  const supabase = getSupabaseServer();
  try {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) return { status: 500, body: { error: "Erreur serveur" } };
    if (!profile) {
      return {
        status: 404,
        body: {
          error: "Aucun compte CALDY trouvé pour cet email. L'utilisateur doit d'abord créer un compte.",
        },
      };
    }

    const { error: insertError } = await supabase
      .from("app_co_owners")
      .insert({
        owner_id: ownerId,
        co_owner_id: (profile as Record<string, unknown>).id,
        co_owner_email: normalizedEmail,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return { status: 409, body: { error: "Ce compte est déjà co-patron" } };
      }
      console.error("[shared/team/coOwners.addCoOwner] DB error:", insertError);
      return { status: 500, body: { error: "Erreur serveur" } };
    }

    return {
      status: 201,
      body: {
        co_owner_id: (profile as Record<string, unknown>).id,
        co_owner_email: normalizedEmail,
      },
    };
  } catch (err) {
    console.error("[shared/team/coOwners.addCoOwner]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function removeCoOwner(
  ownerId: string,
  coOwnerId: string,
): Promise<{ status: number; body: object }> {
  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase
      .from("app_co_owners")
      .delete()
      .eq("owner_id", ownerId)
      .eq("co_owner_id", coOwnerId);
    if (error) return { status: 500, body: { error: "Erreur serveur" } };
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("[shared/team/coOwners.removeCoOwner]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}
