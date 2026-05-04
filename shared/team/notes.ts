import { getSupabaseServer } from "../auth/supabaseFactory";
import { unwrapRpc } from "../auth/serverlessHelpers";

export async function listNotes(token: string): Promise<{ status: number; body: unknown }> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase.rpc("get_member_notes", { p_token: token });
    if (error) {
      console.error("[shared/team/notes.listNotes] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    return { status: 200, body: data ?? [] };
  } catch (err) {
    console.error("[shared/team/notes.listNotes]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}

export async function createNote(
  token: string,
  chantierId: string,
  content: string,
): Promise<{ status: number; body: unknown }> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase.rpc("insert_chantier_note", {
      p_token: token,
      p_chantier_id: chantierId,
      p_content: content,
    });
    if (error) {
      if (error.message?.includes("UNAUTHORIZED")) return { status: 401, body: { error: "Session expirée" } };
      if (error.message?.includes("NOT_ASSIGNED")) return { status: 403, body: { error: "Chantier non assigné" } };
      console.error("[shared/team/notes.createNote] RPC error:", error);
      return { status: 500, body: { error: "Erreur serveur" } };
    }
    return { status: 201, body: unwrapRpc(data as Record<string, unknown>[] | null) };
  } catch (err) {
    console.error("[shared/team/notes.createNote]", err);
    return { status: 500, body: { error: "Erreur serveur" } };
  }
}
