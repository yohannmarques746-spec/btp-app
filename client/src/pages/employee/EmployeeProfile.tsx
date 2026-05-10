import { User, CheckCircle2, XCircle } from "lucide-react";
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

export default function EmployeeProfile({ member, permissions }: EmployeeProfileProps) {
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
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-sm text-white/60">Nom</span>
            <span className="text-sm font-medium text-white">{member.name}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/60">Identifiant membre</span>
            <span className="text-xs font-mono text-white/40 truncate max-w-[180px]">{member.memberId}</span>
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
