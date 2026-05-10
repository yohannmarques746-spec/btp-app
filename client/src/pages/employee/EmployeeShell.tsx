import { useLocation } from "wouter";
import { Loader2, ShieldOff } from "lucide-react";
import { useMemberSession } from "@/hooks/useMemberSession";
import type { MemberPermissions } from "@/hooks/useMemberSession";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import EmployeeOverview from "./EmployeeOverview";
import EmployeeChantiers from "./EmployeeChantiers";
import EmployeePlanning from "./EmployeePlanning";
import EmployeeClients from "./EmployeeClients";
import EmployeeDevis from "./EmployeeDevis";
import EmployeeFactures from "./EmployeeFactures";
import EmployeeCrm from "./EmployeeCrm";
import EmployeeProfile from "./EmployeeProfile";

const PATH_TO_PERMISSION: Record<string, keyof MemberPermissions> = {
  "/team-members-dash/chantiers": "chantiers",
  "/team-members-dash/planning": "planning",
  "/team-members-dash/clients": "clients",
  "/team-members-dash/devis": "devis",
  "/team-members-dash/factures": "factures",
  "/team-members-dash/crm": "crm",
};

function AccessDenied() {
  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
        <ShieldOff className="w-12 h-12 text-white/30" />
        <p className="text-white/70 text-center font-medium">Accès refusé</p>
        <p className="text-white/40 text-sm text-center">
          Vous n'avez pas les permissions nécessaires pour accéder à ce module.
        </p>
      </CardContent>
    </Card>
  );
}

export default function EmployeeShell() {
  const [location] = useLocation();
  const { member, permissions, isLoading, logout } = useMemberSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!member || !permissions) return null;

  const requiredPermission = PATH_TO_PERMISSION[location];
  const isDenied = requiredPermission !== undefined && !permissions[requiredPermission];

  const getContent = () => {
    if (isDenied) return <AccessDenied />;

    if (location === "/team-members-dash" || location === "/team-members-dash/") {
      return <EmployeeOverview member={member} permissions={permissions} />;
    }

    const sub = location.slice("/team-members-dash/".length);
    switch (sub) {
      case "chantiers": return <EmployeeChantiers member={member} />;
      case "planning":  return <EmployeePlanning />;
      case "clients":   return <EmployeeClients />;
      case "devis":     return <EmployeeDevis />;
      case "factures":  return <EmployeeFactures />;
      case "crm":       return <EmployeeCrm />;
      case "profile":   return <EmployeeProfile member={member} permissions={permissions} />;
      default:          return (
        <div className="text-white/60 text-center py-16">Page introuvable.</div>
      );
    }
  };

  return (
    <EmployeeLayout member={member} permissions={permissions} logout={logout}>
      {getContent()}
    </EmployeeLayout>
  );
}
