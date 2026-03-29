import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChantiers } from "@/context/ChantiersContext";
import { useToast } from "@/hooks/use-toast";
import { buildChantierDetails, emptyChantierDetailsShell, mergeClientFieldsIntoDetails } from "@/lib/buildChantierDetails";
import type { ChantierDetails, ChantierHeader } from "@/types/chantierDetails";
import { FicheHeaderSection } from "@/components/chantier/FicheHeaderSection";
import { GeneralInfoSection } from "@/components/chantier/GeneralInfoSection";
import { DatesPlanningSection } from "@/components/chantier/DatesPlanningSection";
import { FinancialSection } from "@/components/chantier/FinancialSection";
import { DocumentsSection } from "@/components/chantier/DocumentsSection";
import { TeamSection } from "@/components/chantier/TeamSection";
import { JournalSection } from "@/components/chantier/JournalSection";
import { MaterialsSection } from "@/components/chantier/MaterialsSection";
import { NotesSection } from "@/components/chantier/NotesSection";

interface FicheChantierProps {
  id: string;
  onBack: () => void;
}

function durationFromDates(start?: string, end?: string): string {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return "";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return `${days} jour${days > 1 ? "s" : ""}`;
}

export function FicheChantier({ id, onBack }: FicheChantierProps) {
  const { chantiers, clients, updateChantier, deleteChantier } = useChantiers();
  const { toast } = useToast();
  const hydratedIdRef = useRef<string | null>(null);

  const [chantierData, setChantierData] = useState<ChantierDetails>(() => emptyChantierDetailsShell(id));

  useEffect(() => {
    hydratedIdRef.current = null;
    setChantierData(emptyChantierDetailsShell(id));
  }, [id]);

  useEffect(() => {
    const record = chantiers.find((c) => c.id === id);
    if (!record) {
      if (hydratedIdRef.current !== `missing:${id}`) {
        setChantierData(emptyChantierDetailsShell(id));
        hydratedIdRef.current = `missing:${id}`;
      }
      return;
    }
    if (hydratedIdRef.current === id) return;
    setChantierData(buildChantierDetails(record, clients));
    hydratedIdRef.current = id;
  }, [chantiers, clients, id]);

  useEffect(() => {
    const record = chantiers.find((c) => c.id === id);
    if (!record || hydratedIdRef.current !== id) return;
    setChantierData((prev) => {
      const next = mergeClientFieldsIntoDetails(prev, record, clients);
      return next === prev ? prev : next;
    });
  }, [clients, chantiers, id]);

  const handleSaveHeader = (next: ChantierHeader) => {
    setChantierData((prev) => ({ ...prev, ...next }));
  };

  const handleArchive = async () => {
    const { error } = await updateChantier(id, { statut: "archivé", archived: true });
    if (error) {
      toast({ title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Chantier archivé" });
    setChantierData((prev) => ({ ...prev, archived: true, statut: "arrete" }));
    onBack();
  };

  const handleUnarchive = async () => {
    const { error } = await updateChantier(id, { statut: "planifié", archived: false });
    if (error) {
      toast({ title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Chantier désarchivé" });
    setChantierData((prev) => ({ ...prev, archived: false, statut: "en_attente" }));
    onBack();
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer définitivement ce chantier ?")) return;
    const { error } = await deleteChantier(id);
    if (error) {
      toast({ title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Chantier supprimé" });
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <Button type="button" variant="ghost" onClick={onBack} className="text-white hover:bg-white/10">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux chantiers
        </Button>
      </div>

      <div className="sticky top-0 z-50 bg-[rgba(5,10,20,0.88)] backdrop-blur-md pb-2">
        <FicheHeaderSection
          chantier={{
            id: chantierData.id,
            nom: chantierData.nom,
            reference: chantierData.reference,
            statut: chantierData.statut,
            archived: chantierData.archived,
          }}
          onSave={handleSaveHeader}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onDelete={handleDelete}
        />
      </div>

      <div className="space-y-4 pb-6">
        <GeneralInfoSection
          data={{
            clientId: chantierData.clientId,
            clientNom: chantierData.clientNom,
            adresseChantier: chantierData.adresseChantier,
            typeTravaux: chantierData.typeTravaux,
            descriptionCourte: chantierData.descriptionCourte,
          }}
          onSave={async (updated) => {
            setChantierData((prev) => ({ ...prev, ...updated }));
            const source = chantiers.find((c) => c.id === id);
            const { error } = await updateChantier(id, {
              clientId: updated.clientId || source?.clientId,
              clientName: updated.clientNom || source?.clientName,
            });
            if (error) {
              toast({ title: "Erreur", description: error.message });
            }
          }}
        />

        <DatesPlanningSection
          data={{
            dateDebutPrevue: chantierData.dateDebutPrevue,
            dateDebutReelle: chantierData.dateDebutReelle,
            dateFinPrevue: chantierData.dateFinPrevue,
            dateFinReelle: chantierData.dateFinReelle,
            dureeJoursCalendaires: chantierData.dureeJoursCalendaires,
            jalons: chantierData.jalons,
          }}
          onSave={async (updated) => {
            setChantierData((prev) => ({ ...prev, ...updated }));
            const nextStart = updated.dateDebutReelle || updated.dateDebutPrevue || "";
            const nextEnd = updated.dateFinReelle || updated.dateFinPrevue || "";
            const nextDuree = durationFromDates(nextStart, nextEnd);
            const { error } = await updateChantier(id, {
              dateDebut: nextStart,
              duree: nextDuree,
            });
            if (error) {
              toast({ title: "Erreur", description: error.message });
            }
          }}
        />

        <FinancialSection
          data={chantierData.financier}
          onSave={(updated) => setChantierData((prev) => ({ ...prev, financier: updated }))}
        />

        <DocumentsSection
          data={{
            devisAssocies: chantierData.devisAssocies,
            facturesAssociees: chantierData.facturesAssociees,
            documentsUploades: chantierData.documentsUploades,
          }}
          onSave={async (updated) => {
            setChantierData((prev) => ({ ...prev, ...updated }));
            const { error } = await updateChantier(id, {
              devisAssocies: (updated.devisAssocies ?? []).map((item) => item.nom),
              facturesAssociees: (updated.facturesAssociees ?? []).map((item) => item.nom),
              documentsUploades: (updated.documentsUploades ?? []).map((item) => ({
                id: item.id,
                nom: item.nom,
                categorie: item.type,
                url: item.lien ?? "",
              })),
            });
            if (error) {
              toast({ title: "Erreur", description: error.message });
            }
          }}
        />

        <TeamSection
          data={{
            chefChantierId: chantierData.chefChantierId,
            chefChantierNom: chantierData.chefChantierNom,
            ouvriersAssignes: chantierData.ouvriersAssignes,
            sousTraitants: chantierData.sousTraitants,
            fournisseursPrincipaux: chantierData.fournisseursPrincipaux,
          }}
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
        />

        <JournalSection
          data={{
            journalEntries: chantierData.journalEntries,
            incidentsProblemes: chantierData.incidentsProblemes,
          }}
          onSave={async (updated) => {
            setChantierData((prev) => ({ ...prev, ...updated }));
            const { error } = await updateChantier(id, {
              journalEntries: (updated.journalEntries ?? []).map((entry) => ({
                id: entry.id,
                date: entry.date,
                auteur: entry.auteur,
                texte: entry.texte,
                meteo: entry.meteo ?? "beau",
              })),
              incidentsProblemes: updated.incidentsProblemes ?? "",
            });
            if (error) {
              toast({ title: "Erreur", description: error.message });
            }
          }}
        />

        <MaterialsSection
          data={{
            materiaux: chantierData.materiaux,
          }}
          onSave={async (updated) => {
            setChantierData((prev) => ({ ...prev, ...updated }));
            const { error } = await updateChantier(id, {
              materiaux: (updated.materiaux ?? []).map((item) => ({
                id: item.id,
                nom: item.nom,
                qte_prevue: item.qtePrevue,
                qte_commandee: item.qteCommandee,
                qte_livree: item.qteLivree,
                fournisseur: item.fournisseur,
              })),
            });
            if (error) {
              toast({ title: "Erreur", description: error.message });
            }
          }}
        />

        <NotesSection
          data={{
            notesInternes: chantierData.notesInternes,
            remarquesClient: chantierData.remarquesClient,
            pointsVigilance: chantierData.pointsVigilance,
          }}
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
        />
      </div>
    </div>
  );
}

