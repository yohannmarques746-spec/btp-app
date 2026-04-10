import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Edit3, FileText, Plus, Save, Trash2, X, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChantierDetails, DocumentLie } from "@/types/chantierDetails";
import { useLocation } from "wouter";
import { useFactures } from "@/hooks/useFactures";
import { formatCHF } from "@/utils/chf";

type DocumentsData = Pick<ChantierDetails, "devisAssocies" | "facturesAssociees" | "documentsUploades">;

interface DocumentsSectionProps {
  data: DocumentsData;
  clientId?: string;
  onSave: (next: DocumentsData) => void;
}

interface DocumentsFormData {
  devisAssocies: DocumentLie[];
  facturesAssociees: DocumentLie[];
  documentsUploades: DocumentLie[];
}

export function DocumentsSection({ data, clientId, onSave }: DocumentsSectionProps) {
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const { factures: allFactures } = useFactures();

  // Auto-detect factures linked to this chantier's client
  const autoFactures = useMemo(() => {
    if (!clientId) return [];
    return allFactures.filter((f) => f.clientId === clientId);
  }, [clientId, allFactures]);
  const [newDevis, setNewDevis] = useState("");
  const [newFacture, setNewFacture] = useState("");
  const [newDocument, setNewDocument] = useState("");
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

  const addItem = (field: keyof DocumentsFormData, rawName: string, type: DocumentLie["type"]) => {
    const name = rawName.trim();
    if (!name) return;
    const current = form.getValues(field);
    form.setValue(field, [
      ...current,
      {
        id: crypto.randomUUID(),
        nom: name,
        type,
        date: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const removeItem = (field: keyof DocumentsFormData, id: string) => {
    const current = form.getValues(field);
    form.setValue(
      field,
      current.filter((item) => item.id !== id),
    );
  };

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
          {isEditing && (
            <div className="mt-2 flex gap-2">
              <Input value={newDevis} onChange={(e) => setNewDevis(e.target.value)} placeholder="Numero devis (ex: DEV-2026-001)" className="bg-black/20 border-white/20 text-white" />
              <Button type="button" onClick={() => { addItem("devisAssocies", newDevis, "devis"); setNewDevis(""); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="mt-2 space-y-2">
            {devis.length === 0 && <p className="text-sm text-white/60">Aucun devis</p>}
            {devis.map((item) => (
              <div key={item.id} className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => setLocation(`/dashboard/quotes?quoteRef=${encodeURIComponent(item.nom)}`)}
                  >
                    {item.nom}
                  </button>
                  {isEditing && (
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => removeItem("devisAssocies", item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Factures emises</Label>
          {isEditing && (
            <div className="mt-2 flex gap-2">
              <Input value={newFacture} onChange={(e) => setNewFacture(e.target.value)} placeholder="Numero facture (ex: FAC-2026-001)" className="bg-black/20 border-white/20 text-white" />
              <Button type="button" onClick={() => { addItem("facturesAssociees", newFacture, "facture"); setNewFacture(""); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="mt-2 space-y-2">
            {factures.length === 0 && autoFactures.length === 0 && <p className="text-sm text-white/60">Aucune facture</p>}
            {factures.map((item) => (
              <div key={item.id} className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => setLocation(`/dashboard/payments?factureRef=${encodeURIComponent(item.nom)}`)}
                  >
                    {item.nom}
                  </button>
                  {isEditing && (
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => removeItem("facturesAssociees", item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {autoFactures.length > 0 && (
              <>
                <p className="text-xs text-emerald-400/70 mt-2 flex items-center gap-1"><Euro className="h-3 w-3" /> Factures détectées pour ce client :</p>
                {autoFactures.map((f) => (
                  <div key={f.id} className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm text-white/90">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setLocation(`/dashboard/payments?factureRef=${encodeURIComponent(f.numero)}`)}
                      >
                        {f.numero}
                      </button>
                      <span className="text-xs text-white/50">{formatCHF(f.montantTTC)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Documents uploades</Label>
          {isEditing && (
            <div className="mt-2 flex gap-2">
              <Input value={newDocument} onChange={(e) => setNewDocument(e.target.value)} placeholder="Nom du document" className="bg-black/20 border-white/20 text-white" />
              <Button type="button" onClick={() => { addItem("documentsUploades", newDocument, "autre"); setNewDocument(""); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {documents.length === 0 && <p className="text-sm text-white/60">Aucun document</p>}
            {documents.map((doc) => (
              <div key={doc.id} className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p>{doc.nom}</p>
                    <p className="text-white/60">{doc.date}</p>
                  </div>
                  {isEditing && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      onClick={() => removeItem("documentsUploades", doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
