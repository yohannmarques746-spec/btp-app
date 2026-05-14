import { User, CheckCircle2, XCircle, HardHat, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MemberSession, MemberPermissions } from "@/hooks/useMemberSession";

const PERMISSION_LABELS: Record<keyof MemberPermissions, string> = {
  dashboard: "Vue d'ensemble",
  chantiers: "Mes chantiers",
  planning: "Planning",
  clients: "Clients",
  devis: "Devis",
  factures: "Factures",
  crm: "CRM",
};

interface EmployeeProfileProps {
  member: MemberSession;
  permissions: MemberPermissions;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function EmployeeProfile({ member, permissions }: EmployeeProfileProps) {
  const initials = getInitials(member.name);
  const chantiersCount = member.assignedChantiers.length;
  const activeAccessCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Mon profil équipe</h1>
        <p className="text-white/60 text-sm">Vos informations et accès</p>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-white/70" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-indigo-500/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-white truncate">{member.name}</p>
              <p className="text-xs text-white/50">Membre de l'équipe</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <HardHat className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-none">{chantiersCount}</p>
                <p className="text-xs text-white/60 mt-1">
                  {chantiersCount > 1 ? "Chantiers assignés" : "Chantier assigné"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-none">{activeAccessCount}</p>
                <p className="text-xs text-white/60 mt-1">
                  {activeAccessCount > 1 ? "Accès activés" : "Accès activé"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-4 h-4 text-white/70" />
            Mes accès
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(Object.keys(PERMISSION_LABELS) as Array<keyof MemberPermissions>).map((key) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-white/80">{PERMISSION_LABELS[key]}</span>
              {permissions[key] ? (
                <Badge className="bg-green-500/20 text-green-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Activé
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/40 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Non activé
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
