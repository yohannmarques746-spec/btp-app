import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getCsrfToken } from "@/lib/csrf";
import { supabase } from "@/lib/supabase";

export interface MemberPermissions {
  crm: boolean;
  planning: boolean;
  devis: boolean;
  factures: boolean;
  chantiers: boolean;
  clients: boolean;
  dashboard: boolean;
}

export interface AssignedChantier {
  id: string;
  nom: string;
  statut: string;
  date_debut: string | null;
  date_fin_prevue: string | null;
  adresse: string | null;
}

export interface MemberSession {
  memberId: string;
  name: string;
  permissions: MemberPermissions;
  ownerId: string;
  assignedChantiers: AssignedChantier[];
}

const SESSION_KEY = "member-session-token";

export function useMemberSession() {
  const [member, setMember] = useState<MemberSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);

    if (!token) {
      setIsLoading(false);
      setLocation("/team-members-login");
      return;
    }

    const clearAndRedirect = () => {
      localStorage.removeItem(SESSION_KEY);
      setLocation("/team-members-login");
    };

    // Rechargement silencieux des données de session (chantiers assignés, permissions…)
    const refresh = async () => {
      const currentToken = localStorage.getItem(SESSION_KEY);
      if (!currentToken) { clearAndRedirect(); return; }
      try {
        const res = await fetch("/api/team/session", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (res.status === 401) { clearAndRedirect(); return; }
        if (res.ok) {
          const data = await res.json() as MemberSession;
          if (data) setMember(data);
        }
      } catch {
        // Erreur réseau silencieuse — l'employé garde les données en cache
      }
    };

    // Chargement initial (avec indicateur de chargement)
    fetch("/api/team/session", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          clearAndRedirect();
          return null;
        }
        return res.json() as Promise<MemberSession>;
      })
      .then((data) => {
        if (data) setMember(data);
      })
      .catch(() => clearAndRedirect())
      .finally(() => setIsLoading(false));

    // Synchronisation temps réel : re-fetch session quand les chantiers ou membres changent
    const realtimeChannel = supabase
      .channel("member-session-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "chantiers" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        void refresh();
      })
      .subscribe();

    // Polling toutes les 30s en fallback (utile si le WebSocket Supabase n'est pas disponible)
    const pollInterval = setInterval(() => void refresh(), 30_000);

    return () => {
      supabase.removeChannel(realtimeChannel);
      clearInterval(pollInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    const token = localStorage.getItem(SESSION_KEY);
    try {
      if (token) {
        const csrf = await getCsrfToken();
        await fetch("/api/team/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrf,
          },
        });
      }
    } catch (err) {
      console.error("Logout failed, clearing local session anyway:", err);
    } finally {
      localStorage.removeItem(SESSION_KEY);
      // Révoquer également la session Supabase Auth côté client (silencieux si absent).
      await supabase.auth.signOut().catch(() => {});
      setLocation("/team-members-login");
    }
  };

  return { member, permissions: member?.permissions ?? null, isLoading, logout };
}
