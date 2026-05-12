import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TeamDevis {
  id: string;
  numero: string | null;
  client_id: string | null;
  client_nom: string | null;
  client_prenom: string | null;
  date_emission: string | null;
  date_validite: string | null;
  statut: string | null;
  objet: string | null;
  montant_ht: number | null;
  montant_ttc: number | null;
  created_at: string;
}

function statutColor(statut: string | null) {
  switch (statut) {
    case "accepté":  return "bg-green-500/20 text-green-300";
    case "refusé":   return "bg-red-500/20 text-red-300";
    case "envoyé":   return "bg-blue-500/20 text-blue-300";
    case "brouillon": return "bg-white/10 text-white/60";
    case "expiré":   return "bg-orange-500/20 text-orange-300";
    default:          return "bg-white/10 text-white/60";
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

function DevisCard({ devis }: { devis: TeamDevis }) {
  const clientName = [devis.client_prenom, devis.client_nom].filter(Boolean).join(" ") || "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {devis.numero && (
              <span className="text-xs font-mono text-white/50">{devis.numero}</span>
            )}
            <p className="font-semibold text-white truncate">
              {devis.objet ?? "Sans objet"}
            </p>
          </div>
          <p className="text-xs text-white/50 mt-0.5">{clientName}</p>
        </div>
        {devis.statut && (
          <Badge className={`${statutColor(devis.statut)} shrink-0`}>{devis.statut}</Badge>
        )}
      </div>
      <div className="flex gap-4 text-xs text-white/50">
        <span>Émis le {formatDate(devis.date_emission)}</span>
        {devis.date_validite && (
          <span>Valide jusqu'au {formatDate(devis.date_validite)}</span>
        )}
      </div>
      <div className="flex gap-4 text-sm font-medium">
        <span className="text-white/70">HT : {formatAmount(devis.montant_ht)}</span>
        <span className="text-white">TTC : {formatAmount(devis.montant_ttc)}</span>
      </div>
    </motion.div>
  );
}

export default function EmployeeDevis() {
  const [devisList, setDevisList] = useState<TeamDevis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDevis = useCallback(async () => {
    const token = localStorage.getItem("member-session-token") ?? "";
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team/data/devis", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDevisList(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDevis(); }, [fetchDevis]);

  const filtered = devisList.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.numero ?? "").toLowerCase().includes(q) ||
      (d.objet ?? "").toLowerCase().includes(q) ||
      (d.client_nom ?? "").toLowerCase().includes(q) ||
      (d.client_prenom ?? "").toLowerCase().includes(q) ||
      (d.statut ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Devis</h1>
        <p className="text-white/60 text-sm">
          {loading ? "Chargement…" : `${devisList.length} devis`}
        </p>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-white/70" />
            Tous les devis
            {loading && <Loader2 className="w-3 h-3 animate-spin text-white/40 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && devisList.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un devis…"
                className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-white/40 text-sm"
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {search ? "Aucun résultat pour cette recherche" : "Aucun devis disponible"}
              </p>
            </div>
          ) : (
            filtered.map((d) => <DevisCard key={d.id} devis={d} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
