import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Edit3, FileText, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ChantierDetails, DocumentLie } from "@/types/chantierDetails";

type DocumentsData = Pick<ChantierDetails, "devisAssocies" | "facturesAssociees" | "documentsUploades">;

interface DocumentsSectionProps {
  data: DocumentsData;
  onSave: (next: DocumentsData) => void;
}

interface DocumentsFormData {
  devisAssocies: DocumentLie[];
  facturesAssociees: DocumentLie[];
  documentsUploades: DocumentLie[];
}

export function DocumentsSection({ data, onSave }: DocumentsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<DocumentsFormData>({
    defaultValues: {
      devisAssocies: data.devisAssocies ?? [],
      facturesAssociees: data.facturesAssociees ?? [],
      documentsUploades: data.documentsUploades ?? [],
    },
  });

  useEffect(() => {
    form.reset({
      devisAssocies: data.devisAssocies ?? [],
      facturesAssociees: data.facturesAssociees ?? [],
      documentsUploades: data.documentsUploades ?? [],
    });
  }, [data, form]);

  const handleSave = form.handleSubmit((values) => {
    onSave(values);
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const devis = form.watch("devisAssocies");
  const factures = form.watch("facturesAssociees");
  const documents = form.watch("documentsUploades");

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Documents lies</h3>
        </div>
        {!isEditing ? (
          <Button type="button" onClick={() => setIsEditing(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/20">
            <Edit3 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} className="bg-white/20 hover:bg-white/30 text-white border border-white/20">
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="text-white border-white/20 hover:bg-white/10">
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Devis associes</Label>
          <div className="mt-2 space-y-2">
            {devis.length === 0 && <p className="text-sm text-white/60">Aucun devis</p>}
            {devis.map((item) => (
              <div key={item.id} className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90">
                <p>{item.nom}</p>
                <p className="text-white/60">{item.statut || "sans statut"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Factures emises</Label>
          <div className="mt-2 space-y-2">
            {factures.length === 0 && <p className="text-sm text-white/60">Aucune facture</p>}
            {factures.map((item) => (
              <div key={item.id} className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90">
                <p>{item.nom}</p>
                <p className="text-white/60">{item.statut || "sans statut"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Zone upload (UI fictif)</Label>
          <div className="mt-3 rounded-lg border border-dashed border-white/20 p-3">
            <input
              type="file"
              className="w-full cursor-pointer text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white"
              onChange={() => {
                console.log("UI upload fictif: aucun fichier n'est traite.");
              }}
            />
            <p className="mt-2 text-xs text-white/60">Plans, PV de reception, bons de commande (visuel seulement)</p>
          </div>
          <div className="mt-3 space-y-2">
            {documents.length === 0 && <p className="text-sm text-white/60">Aucun document</p>}
            {documents.map((doc) => (
              <div key={doc.id} className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p>{doc.nom}</p>
                    <p className="text-white/60">{doc.type} - {doc.date}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => console.log("Telecharger (UI fictif)", doc.id)}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      onClick={() => console.log("Supprimer (UI fictif)", doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
