import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChantiers } from "@/context/ChantiersContext";
import { chantierDetailsMock } from "@/mocks/chantierMock";
import type { ChantierDetails, ChantierHeader, ChantierStatut } from "@/types/chantierDetails";
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

function mapLegacyStatus(statut: "planifié" | "en cours" | "terminé"): ChantierStatut {
  if (statut === "en cours") return "en_cours";
  if (statut === "terminé") return "termine";
  return "en_attente";
}

export function FicheChantier({ id, onBack }: FicheChantierProps) {
  const { chantiers } = useChantiers();

  const initialDetails = useMemo<ChantierDetails>(() => {
    const fromList = chantiers.find((c) => c.id === id);
    if (!fromList) {
      return { ...chantierDetailsMock, id };
    }
    return {
      ...chantierDetailsMock,
      id: fromList.id,
      nom: fromList.nom,
      statut: mapLegacyStatus(fromList.statut),
      clientNom: fromList.clientName,
      dateDebutPrevue: fromList.dateDebut || chantierDetailsMock.dateDebutPrevue,
      descriptionCourte: chantierDetailsMock.descriptionCourte,
    };
  }, [chantiers, id]);

  const [chantierData, setChantierData] = useState<ChantierDetails>(initialDetails);

  const handleSaveHeader = (next: ChantierHeader) => {
    setChantierData((prev) => ({ ...prev, ...next }));
  };

  const handleArchive = () => {
    setChantierData((prev) => ({ ...prev, archived: true }));
  };

  const handleDelete = () => {
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
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
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
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
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
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
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
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
        />

        <MaterialsSection
          data={{
            materiaux: chantierData.materiaux,
          }}
          onSave={(updated) => setChantierData((prev) => ({ ...prev, ...updated }))}
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

