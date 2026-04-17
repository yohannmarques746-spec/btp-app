import { useState, useEffect } from "react";
import { useLocation } from "wouter";

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

    fetch("/api/team/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401) { clearAndRedirect(); return null; }
        return res.json() as Promise<MemberSession>;
      })
      .then((data) => { if (data) setMember(data); })
      .catch(clearAndRedirect)
      .finally(() => setIsLoading(false));
  }, []); // intentionnellement vide — vérification au mount uniquement

  const logout = async () => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      await fetch("/api/team/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    setLocation("/team-members-login");
  };

  return { member, permissions: member?.permissions ?? null, isLoading, logout };
}
