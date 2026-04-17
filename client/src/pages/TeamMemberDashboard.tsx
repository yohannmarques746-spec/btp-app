import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  LogOut,
  Loader2,
  Send,
  MapPin,
  CheckCircle2,
  Clock,
  StickyNote,
  ShieldOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMemberSession, type AssignedChantier } from "@/hooks/useMemberSession";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChantierNote {
  id: string;
  chantier_id: string;
  content: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTodayChantier(c: AssignedChantier): boolean {
  if (!c.date_debut || !c.date_fin_prevue) return false;
  const today = new Date().toISOString().slice(0, 10);
  return c.date_debut <= today && today <= c.date_fin_prevue;
}

function statutColor(statut: string) {
  switch (statut) {
    case "en cours":  return "bg-blue-500/20 text-blue-300";
    case "terminé":   return "bg-green-500/20 text-green-300";
    case "planifié":  return "bg-yellow-500/20 text-yellow-300";
    default:          return "bg-white/10 text-white/60";
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

// ─── Formulaire note + liste notes ───────────────────────────────────────────

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
      const token = localStorage.getItem("member-session-token") ?? "";
      const res = await fetch("/api/team/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  const chanierNotes = notes.filter((n) => n.chantier_id === chantierId);

  return (
    <div className="space-y-3 mt-3 border-t border-white/10 pt-3">
      {/* Historique notes */}
      {chanierNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/50 flex items-center gap-1">
            <StickyNote className="w-3 h-3" />
            Notes de suivi
          </p>
          {chanierNotes.map((note) => (
            <div key={note.id} className="bg-white/5 rounded-lg p-2.5 space-y-1">
              <p className="text-sm text-white/90">{note.content}</p>
              <p className="text-xs text-white/40">{formatDateTime(note.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire ajout */}
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

// ─── Carte chantier ───────────────────────────────────────────────────────────

function ChantierCard({
  chantier,
  isToday,
  notes,
  onNoteAdded,
}: {
  chantier: AssignedChantier;
  isToday: boolean;
  notes: ChantierNote[];
  onNoteAdded: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{chantier.nom}</p>
          {chantier.adresse && (
            <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
              <MapPin className="w-3 h-3" />
              {chantier.adresse}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={statutColor(chantier.statut)}>{chantier.statut}</Badge>
          {isToday && (
            <Badge className="bg-orange-500/20 text-orange-300 text-xs">Aujourd'hui</Badge>
          )}
        </div>
      </div>

      <div className="flex gap-4 text-xs text-white/60">
        <span><CalendarDays className="w-3 h-3 inline mr-1" />Début : {formatDate(chantier.date_debut)}</span>
        <span><Clock className="w-3 h-3 inline mr-1" />Fin : {formatDate(chantier.date_fin_prevue)}</span>
      </div>

      <ChantierNoteSection chantierId={chantier.id} notes={notes} onNoteAdded={onNoteAdded} />
    </motion.div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function TeamMemberDashboard() {
  const { member, permissions, isLoading, logout } = useMemberSession();
  const [notes, setNotes] = useState<ChantierNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

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
    if (member && permissions?.chantiers) fetchNotes();
  }, [member, permissions?.chantiers, fetchNotes]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!member) return null;

  const todayChantiers = member.assignedChantiers.filter(isTodayChantier);
  const otherChantiers = member.assignedChantiers.filter((c) => !isTodayChantier(c));

  const hasAnyPermission = permissions?.dashboard || permissions?.chantiers || permissions?.planning;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Bonjour, {member.name}</h1>
          <p className="text-white/60 text-sm">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Déconnexion
        </Button>
      </motion.div>

      {/* Aucune permission activée */}
      {!hasAnyPermission && (
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldOff className="w-12 h-12 text-white/30" />
            <p className="text-white/70 text-center">
              Aucune fonctionnalité activée pour votre compte.
            </p>
            <p className="text-white/40 text-sm text-center">
              Contactez votre patron pour activer l'accès à vos sections.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Résumé rapide — permission dashboard */}
      {permissions?.dashboard && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-white/50 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{member.assignedChantiers.length}</p>
                <p className="text-xs text-white/60">
                  Chantier{member.assignedChantiers.length > 1 ? "s" : ""} assigné{member.assignedChantiers.length > 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-orange-400/70 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{todayChantiers.length}</p>
                <p className="text-xs text-white/60">
                  Tâche{todayChantiers.length > 1 ? "s" : ""} du jour
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tâches du jour — permission chantiers */}
      {permissions?.chantiers && todayChantiers.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4 text-orange-400" />
              Tâches du jour
              {notesLoading && <Loader2 className="w-3 h-3 animate-spin text-white/40 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayChantiers.map((c) => (
              <ChantierCard
                key={c.id}
                chantier={c}
                isToday
                notes={notes}
                onNoteAdded={fetchNotes}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Planning personnel — permission planning */}
      {permissions?.planning && (
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4 text-white/70" />
              Planning personnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.assignedChantiers.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Aucun chantier assigné pour l'instant</p>
              </div>
            ) : (
              <>
                {/* Dans planning, on montre les chantiers en lecture + notes si permission chantiers aussi */}
                {otherChantiers.map((c) => (
                  permissions?.chantiers ? (
                    <ChantierCard
                      key={c.id}
                      chantier={c}
                      isToday={false}
                      notes={notes}
                      onNoteAdded={fetchNotes}
                    />
                  ) : (
                    <div
                      key={c.id}
                      className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{c.nom}</p>
                          {c.adresse && (
                            <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
                              <MapPin className="w-3 h-3" />{c.adresse}
                            </div>
                          )}
                        </div>
                        <Badge className={statutColor(c.statut)}>{c.statut}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-white/60 mt-2">
                        <span><CalendarDays className="w-3 h-3 inline mr-1" />Début : {formatDate(c.date_debut)}</span>
                        <span><Clock className="w-3 h-3 inline mr-1" />Fin : {formatDate(c.date_fin_prevue)}</span>
                      </div>
                    </div>
                  )
                ))}
                {todayChantiers.length > 0 && otherChantiers.length === 0 && (
                  <p className="text-sm text-white/50 text-center py-4">
                    Tous vos chantiers sont en cours aujourd'hui.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chantiers assignés seul (permission chantiers sans planning) */}
      {permissions?.chantiers && !permissions?.planning && otherChantiers.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-white/70" />
              Chantiers assignés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherChantiers.map((c) => (
              <ChantierCard
                key={c.id}
                chantier={c}
                isToday={false}
                notes={notes}
                onNoteAdded={fetchNotes}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
