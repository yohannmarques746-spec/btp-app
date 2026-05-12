import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TeamRendezVous {
  id: string;
  chantier_id: string | null;
  titre: string;
  date: string;
  heure_debut: string | null;
  heure_fin: string | null;
  description: string | null;
  statut: string | null;
  created_at: string;
}

function statutColor(statut: string | null) {
  switch (statut) {
    case "confirmé":   return "bg-green-500/20 text-green-300";
    case "annulé":     return "bg-red-500/20 text-red-300";
    case "en attente": return "bg-yellow-500/20 text-yellow-300";
    default:           return "bg-white/10 text-white/60";
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTime(t: string | null) {
  if (!t) return null;
  return t.slice(0, 5); // "HH:MM"
}

function isToday(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

function isFuture(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr >= today;
}

function RdvCard({ rdv }: { rdv: TeamRendezVous }) {
  const timeRange = [formatTime(rdv.heure_debut), formatTime(rdv.heure_fin)]
    .filter(Boolean).join(" → ");
  const today = isToday(rdv.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 backdrop-blur-md border rounded-xl space-y-2 ${
        today
          ? "bg-blue-500/10 border-blue-400/30"
          : "bg-black/20 border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {today && (
              <Badge className="bg-blue-500/30 text-blue-200 text-xs px-1.5">Aujourd'hui</Badge>
            )}
            <p className="font-semibold text-white">{rdv.titre}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(rdv.date)}
            </span>
            {timeRange && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeRange}
              </span>
            )}
          </div>
        </div>
        {rdv.statut && (
          <Badge className={statutColor(rdv.statut)}>{rdv.statut}</Badge>
        )}
      </div>
      {rdv.description && (
        <p className="text-sm text-white/60">{rdv.description}</p>
      )}
    </motion.div>
  );
}

function groupByDate(rdvs: TeamRendezVous[]) {
  const groups: Record<string, TeamRendezVous[]> = {};
  for (const rdv of rdvs) {
    if (!groups[rdv.date]) groups[rdv.date] = [];
    groups[rdv.date].push(rdv);
  }
  return groups;
}

export default function EmployeePlanning() {
  const [rdvs, setRdvs] = useState<TeamRendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  const fetchPlanning = useCallback(async () => {
    const token = localStorage.getItem("member-session-token") ?? "";
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team/data/planning", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRdvs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPlanning(); }, [fetchPlanning]);

  const visible = rdvs.filter((r) => showPast || isFuture(r.date));
  const pastCount = rdvs.filter((r) => !isFuture(r.date)).length;
  const groups = groupByDate(visible);
  const sortedDates = Object.keys(groups).sort();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Planning</h1>
          <p className="text-white/60 text-sm">
            {loading ? "Chargement…" : `${visible.length} rendez-vous`}
          </p>
        </div>
        {!loading && pastCount > 0 && (
          <button
            onClick={() => setShowPast((v) => !v)}
            className="text-xs text-white/40 hover:text-white/70 underline"
          >
            {showPast ? "Masquer les passés" : `Voir les ${pastCount} passé${pastCount !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-white/70" />
            Agenda
            {loading && <Loader2 className="w-3 h-3 animate-spin text-white/40 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucun rendez-vous à venir</p>
            </div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  {formatDate(date)}
                </p>
                {groups[date].map((rdv) => <RdvCard key={rdv.id} rdv={rdv} />)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
