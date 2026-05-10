import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function EmployeePlanning() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Planning</h1>
        <p className="text-white/60 text-sm">Votre planning personnel</p>
      </div>
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Calendar className="w-12 h-12 text-white/30" />
          <p className="text-white/70 text-center font-medium">Module Planning — bientôt disponible</p>
          <p className="text-white/40 text-sm text-center max-w-xs">
            La vue planning interactive sera disponible dans une prochaine mise à jour.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
