import { useCallback, useEffect, useId, useState } from "react";
import { supabase, getCurrentUserId } from "@/lib/supabase";

export interface TeamMemberLite {
  id: string;
  name: string;
  role: string | null;
}

interface RawTeamMemberRow {
  id: string;
  name: string | null;
  role: string | null;
  status: string | null;
}

function mapRow(row: RawTeamMemberRow): TeamMemberLite {
  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "",
    role: typeof row.role === "string" && row.role.trim() !== "" ? row.role : null,
  };
}

/**
 * Charge la liste des membres d'équipe actifs (status='actif') du propriétaire courant.
 * - Filtre côté serveur sur le statut et l'utilisateur authentifié (cohérence avec RLS).
 * - Abonnement realtime sur la table `team_members` afin de refléter les modifications
 *   effectuées depuis d'autres écrans (ex : page Équipe).
 */
export function useTeamMembers() {
  const instanceId = useId();
  const [members, setMembers] = useState<TeamMemberLite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const userId = await getCurrentUserId();
    if (!userId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("team_members")
      .select("id, name, role, status")
      .eq("status", "actif")
      .order("name", { ascending: true });

    if (fetchError) {
      console.error("useTeamMembers.refresh", fetchError);
      setError(fetchError.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as RawTeamMemberRow[];
    setMembers(rows.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel(`team-members-realtime-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, instanceId]);

  return { members, loading, error, refresh };
}
