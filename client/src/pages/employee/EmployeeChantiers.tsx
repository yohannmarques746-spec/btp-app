import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getCsrfToken } from "@/lib/csrf";
import {
  Building2,
  CalendarDays,
  Loader2,
  Send,
  MapPin,
  StickyNote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { MemberSession } from "@/hooks/useMemberSession";

interface ChantierNote {
  id: string;
  chantier_id: string;
  content: string;
  created_at: string;
}

interface TeamChantier {
  id: string;
  nom: string;
  client_id: string | null;
  client_nom: string | null;
  client_prenom: string | null;
  adresse: string | null;
  date_debut: string | null;
  date_fin_prevue: string | null;
  duree: string | null;
  statut: string | null;
  archived: boolean | null;
  created_at: string;
}

function statutColor(statut: string | null) {
  switch (statut) {
    case "en_cours":
    case "en cours": return "bg-blue-500/20 text-blue-300";
    case "terminé":  return "bg-green-500/20 text-green-300";
    case "planifié": return "bg-yellow-500/20 text-yellow-300";
    default:         return "bg-white/10 text-white/60";
  }
}

function statutLabel(statut: string | null) {
  switch (statut) {
    case "en_cours": return "en cours";
    case "terminé":  return "terminé";
    case "planifié": return "planifié";
    default:         return statut ?? "—";
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function ChantierNoteSection({
  chantierId,
  notes,
  onNoteAdded,
}: {
  chantierId: string;
  notes: ChantierNote[];
  onNoteAdded: () => void;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const sessionToken = localStorage.getItem("member-session-token") ?? "";
      const csrf = await getCsrfToken();
      const res = await fetch("/api/team/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ chantierId, content }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setContent("");
      toast({ title: "Note enregistrée" });
      onNoteAdded();
    } catch {
      toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const chantierNotes = notes.filter((n) => n.chantier_id === chantierId);

  return (
    <div className="space-y-3 mt-3 border-t border-white/10 pt-3">
      {chantierNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/50 flex items-center gap-1">
            <StickyNote className="w-3 h-3" />
            Notes de suivi
          </p>
          {chantierNotes.map((note) => (
            <div key={note.id} className="bg-white/5 rounded-lg p-2.5 space-y-1">
              <p className="text-sm text-white/90">{note.content}</p>
              <p className="text-xs text-white/40">{formatDateTime(note.created_at)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ajouter une note de suivi…"
          className="bg-black/20 border-white/10 text-white placeholder:text-white/40 resize-none text-sm"
          rows={2}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="bg-white/20 text-white border border-white/10 hover:bg-white/30 disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
          Envoyer
        </Button>
      </div>
    </div>
  );
}

function ChantierCard({
  chantier,
  notes,
  onNoteAdded,
}: {
  chantier: TeamChantier;
  notes: ChantierNote[];
  onNoteAdded: () => void;
}) {
  const clientName = [chantier.client_nom, chantier.client_prenom].filter(Boolean).join(" ").trim() || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{chantier.nom}</p>
          {clientName && (
            <p className="text-xs text-white/50 mt-0.5">{clientName}</p>
          )}
          {chantier.adresse && (
            <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
              <MapPin className="w-3 h-3" />
              {chantier.adresse}
            </div>
          )}
        </div>
        <Badge className={statutColor(chantier.statut)}>
          {statutLabel(chantier.statut)}
        </Badge>
      </div>
      <div className="flex gap-4 text-xs text-white/60">
        <span>
          <CalendarDays className="w-3 h-3 inline mr-1" />
          Début : {formatDate(chantier.date_debut)}
        </span>
        {chantier.date_fin_prevue && (
          <span>Fin prévue : {formatDate(chantier.date_fin_prevue)}</span>
        )}
      </div>
      <ChantierNoteSection chantierId={chantier.id} notes={notes} onNoteAdded={onNoteAdded} />
    </motion.div>
  );
}

interface EmployeeChantiersProps {
  member: MemberSession;
}

export default function EmployeeChantiers({ member: _member }: EmployeeChantiersProps) {
  const [chantiers, setChantiers] = useState<TeamChantier[]>([]);
  const [notes, setNotes] = useState<ChantierNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);

  const fetchChantiers = useCallback(async () => {
    const token = localStorage.getItem("member-session-token") ?? "";
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team/data/chantiers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as TeamChantier[];
        setChantiers(data.filter((c) => !c.archived));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    const token = localStorage.getItem("member-session-token") ?? "";
    if (!token) return;
    setNotesLoading(true);
    try {
      const res = await fetch("/api/team/notes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotes(await res.json());
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChantiers();
    void fetchNotes();
  }, [fetchChantiers, fetchNotes]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Chantiers</h1>
        <p className="text-white/60 text-sm">
          {loading ? "Chargement…" : `${chantiers.length} chantier${chantiers.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-white/70" />
            Tous les chantiers
            {(loading || notesLoading) && <Loader2 className="w-3 h-3 animate-spin text-white/40 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : chantiers.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucun chantier disponible</p>
            </div>
          ) : (
            chantiers.map((c) => (
              <ChantierCard
                key={c.id}
                chantier={c}
                notes={notes}
                onNoteAdded={fetchNotes}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
