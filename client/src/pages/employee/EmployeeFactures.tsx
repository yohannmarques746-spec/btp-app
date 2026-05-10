import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function EmployeeFactures() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Factures</h1>
        <p className="text-white/60 text-sm">Consultation des factures de l'entreprise</p>
      </div>
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Receipt className="w-12 h-12 text-white/30" />
          <p className="text-white/70 text-center font-medium">Module Factures — bientôt disponible</p>
          <p className="text-white/40 text-sm text-center max-w-xs">
            L'accès aux factures sera disponible dans une prochaine mise à jour.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
