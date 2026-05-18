import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Download,
  Edit3,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChantierDetails, DocumentLie } from "@/types/chantierDetails";
import { useLocation } from "wouter";
import { useFactures } from "@/hooks/useFactures";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCHF } from "@/utils/chf";
import { DevisAutocompleteInput } from "@/components/chantier/DevisAutocompleteInput";
import { FactureAutocompleteInput } from "@/components/chantier/FactureAutocompleteInput";
import { uploadDocumentToStorage } from "@/utils/storageHelper";

type DocumentsData = Pick<
  ChantierDetails,
  "devisAssocies" | "facturesAssociees" | "documentsUploades"
>;

interface DocumentsSectionProps {
  data: DocumentsData;
  /** Filtre les factures suggérées + utilisé par les flux liés. */
  clientId?: string;
  /** Nécessaire pour construire le chemin Storage `${userId}/${chantierId}/...`. */
  chantierId: string;
  onSave: (next: DocumentsData) => void;
}

interface DocumentsFormData {
  devisAssocies: DocumentLie[];
  facturesAssociees: DocumentLie[];
  documentsUploades: DocumentLie[];
}

function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallback below */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || parsed.host;
  } catch {
    return url;
  }
}

export function DocumentsSection({ data, clientId, chantierId, onSave }: DocumentsSectionProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [linkInput, setLinkInput] = useState<string>("");
  const [linkNameInput, setLinkNameInput] = useState<string>("");
  const [docNameInput, setDocNameInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { factures: allFactures } = useFactures();

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

  const devis = form.watch("devisAssocies");
  const factures = form.watch("facturesAssociees");
  const documents = form.watch("documentsUploades");

  // Factures déjà liées manuellement (numéros) — pour éviter les doublons côté autocomplete.
  const manualFactureNumeros = useMemo(
    () => new Set(factures.map((f) => f.nom)),
    [factures],
  );

  // Factures du client courant non déjà liées — affichage en suggestion.
  const autoFactures = useMemo(() => {
    if (!clientId) return [];
    return allFactures.filter(
      (f) => f.clientId === clientId && !manualFactureNumeros.has(f.numero),
    );
  }, [clientId, allFactures, manualFactureNumeros]);

  const handleSave = form.handleSubmit((values) => {
    onSave(values);
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset({
      devisAssocies: data.devisAssocies ?? [],
      facturesAssociees: data.facturesAssociees ?? [],
      documentsUploades: data.documentsUploades ?? [],
    });
    setLinkInput("");
    setLinkNameInput("");
    setDocNameInput("");
    setIsEditing(false);
  };

  const addDevisFromAutocomplete = (numero: string, lien?: string) => {
    const trimmed = numero.trim();
    if (!trimmed) return;
    const current = form.getValues("devisAssocies");
    if (current.some((d) => d.nom === trimmed)) return;
    form.setValue("devisAssocies", [
      ...current,
      {
        id: safeRandomUUID(),
        nom: trimmed,
        type: "devis",
        date: todayIso(),
        lien,
      },
    ]);
  };

  const addFactureFromAutocomplete = (numero: string, lien?: string) => {
    const trimmed = numero.trim();
    if (!trimmed) return;
    const current = form.getValues("facturesAssociees");
    if (current.some((f) => f.nom === trimmed)) return;
    form.setValue("facturesAssociees", [
      ...current,
      {
        id: safeRandomUUID(),
        nom: trimmed,
        type: "facture",
        date: todayIso(),
        lien,
      },
    ]);
  };

  const removeDevis = (id: string) => {
    form.setValue(
      "devisAssocies",
      form.getValues("devisAssocies").filter((item) => item.id !== id),
    );
  };

  const removeFacture = (id: string) => {
    form.setValue(
      "facturesAssociees",
      form.getValues("facturesAssociees").filter((item) => item.id !== id),
    );
  };

  const removeDocument = (id: string) => {
    form.setValue(
      "documentsUploades",
      form.getValues("documentsUploades").filter((item) => item.id !== id),
    );
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!user?.id) {
      toast({ title: "Erreur", description: "Reconnectez-vous pour téléverser un fichier." });
      return;
    }
    if (!chantierId) {
      toast({ title: "Erreur", description: "Chantier introuvable, impossible de téléverser." });
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadDocumentToStorage(file, user.id, chantierId);
      const current = form.getValues("documentsUploades");
      form.setValue("documentsUploades", [
        ...current,
        {
          id: safeRandomUUID(),
          nom: file.name,
          type: "autre",
          date: todayIso(),
          lien: uploaded.publicUrl,
        },
      ]);
      toast({ title: "Fichier téléversé", description: file.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("DocumentsSection.handleFileChange", err);
      toast({ title: "Téléversement échoué", description: message });
    } finally {
      setIsUploading(false);
    }
  };

  const addLinkDocument = () => {
    const url = normalizeUrl(linkInput);
    if (!url) return;
    const displayName = linkNameInput.trim() || fileNameFromUrl(url);
    const current = form.getValues("documentsUploades");
    form.setValue("documentsUploades", [
      ...current,
      {
        id: safeRandomUUID(),
        nom: displayName,
        type: "autre",
        date: todayIso(),
        lien: url,
      },
    ]);
    setLinkInput("");
    setLinkNameInput("");
  };

  const addManualDocument = () => {
    const name = docNameInput.trim();
    if (!name) return;
    const current = form.getValues("documentsUploades");
    form.setValue("documentsUploades", [
      ...current,
      {
        id: safeRandomUUID(),
        nom: name,
        type: "autre",
        date: todayIso(),
      },
    ]);
    setDocNameInput("");
  };

  const openLink = (lien?: string) => {
    if (!lien) return;
    window.open(lien, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Documents liés</h3>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSave}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
            >
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="text-white border-white/20 hover:bg-white/10"
            >
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---- Devis associés ------------------------------------------------ */}
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Devis associés</Label>
          {isEditing && (
            <div className="mt-2">
              <DevisAutocompleteInput
                devisId={null}
                devisNumero={null}
                disabledIds={[]}
                onChange={(details) => {
                  if (details.devisId && details.devisNumero) {
                    addDevisFromAutocomplete(
                      details.devisNumero,
                      `/dashboard/quotes?quoteRef=${encodeURIComponent(details.devisNumero)}`,
                    );
                  } else if (details.devisNumero) {
                    // Saisie libre (numéro tapé qui ne match aucun devis).
                    addDevisFromAutocomplete(details.devisNumero);
                  }
                }}
              />
            </div>
          )}
          <div className="mt-3 space-y-2">
            {devis.length === 0 && <p className="text-sm text-white/60">Aucun devis</p>}
            {devis.map((item) => (
              <div
                key={item.id}
                className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left hover:underline"
                    onClick={() =>
                      setLocation(
                        item.lien ?? `/dashboard/quotes?quoteRef=${encodeURIComponent(item.nom)}`,
                      )
                    }
                  >
                    <span>{item.nom}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-white/60" />
                  </button>
                  {isEditing && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      onClick={() => removeDevis(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Factures émises ----------------------------------------------- */}
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Factures émises</Label>
          {isEditing && (
            <div className="mt-2">
              <FactureAutocompleteInput
                factureId={null}
                factureNumero={null}
                clientId={clientId ?? null}
                disabledIds={[]}
                onChange={(details) => {
                  if (details.factureId && details.factureNumero) {
                    addFactureFromAutocomplete(
                      details.factureNumero,
                      `/dashboard/payments?factureRef=${encodeURIComponent(details.factureNumero)}`,
                    );
                  } else if (details.factureNumero) {
                    addFactureFromAutocomplete(details.factureNumero);
                  }
                }}
              />
            </div>
          )}
          <div className="mt-3 space-y-2">
            {factures.length === 0 && autoFactures.length === 0 && (
              <p className="text-sm text-white/60">Aucune facture</p>
            )}
            {factures.map((item) => (
              <div
                key={item.id}
                className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left hover:underline"
                    onClick={() =>
                      setLocation(
                        item.lien ?? `/dashboard/payments?factureRef=${encodeURIComponent(item.nom)}`,
                      )
                    }
                  >
                    <span>{item.nom}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-white/60" />
                  </button>
                  {isEditing && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      onClick={() => removeFacture(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {autoFactures.length > 0 && (
              <>
                <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400/70">
                  <Euro className="h-3 w-3" /> Factures détectées pour ce client :
                </p>
                {autoFactures.map((f) => (
                  <div
                    key={f.id}
                    className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm text-white/90"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() =>
                          setLocation(
                            `/dashboard/payments?factureRef=${encodeURIComponent(f.numero)}`,
                          )
                        }
                      >
                        {f.numero}
                      </button>
                      <span className="text-xs text-white/50">{formatCHF(f.montantTTC)}</span>
                    </div>
                    {isEditing && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 border-emerald-500/30 px-2 text-xs text-emerald-200 hover:bg-emerald-500/10"
                        onClick={() =>
                          addFactureFromAutocomplete(
                            f.numero,
                            `/dashboard/payments?factureRef=${encodeURIComponent(f.numero)}`,
                          )
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Lier
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ---- Documents uploadés -------------------------------------------- */}
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <Label className="text-white/70">Documents uploadés</Label>
          {isEditing && (
            <div className="mt-2 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white/15 text-white border border-white/20 hover:bg-white/25"
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Téléversement…" : "Téléverser un fichier"}
              </Button>

              <div className="space-y-2 rounded-md border border-white/10 bg-black/15 p-2">
                <Label className="text-xs text-white/60">Coller un lien</Label>
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://…"
                  className="bg-black/20 border-white/20 text-white"
                />
                <Input
                  value={linkNameInput}
                  onChange={(e) => setLinkNameInput(e.target.value)}
                  placeholder="Nom affiché (optionnel)"
                  className="bg-black/20 border-white/20 text-white"
                />
                <Button
                  type="button"
                  onClick={addLinkDocument}
                  disabled={!linkInput.trim()}
                  className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter le lien
                </Button>
              </div>

              <div className="space-y-2 rounded-md border border-white/10 bg-black/15 p-2">
                <Label className="text-xs text-white/60">Référence libre</Label>
                <div className="flex gap-2">
                  <Input
                    value={docNameInput}
                    onChange={(e) => setDocNameInput(e.target.value)}
                    placeholder="Nom du document"
                    className="bg-black/20 border-white/20 text-white"
                  />
                  <Button
                    type="button"
                    onClick={addManualDocument}
                    disabled={!docNameInput.trim()}
                    className="bg-white/15 border border-white/20 text-white hover:bg-white/25"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {documents.length === 0 && <p className="text-sm text-white/60">Aucun document</p>}
            {documents.map((doc) => {
              const hasLink = Boolean(doc.lien && doc.lien.trim());
              return (
                <div
                  key={doc.id}
                  className="rounded border border-white/10 bg-black/20 p-2 text-sm text-white/90"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{doc.nom}</p>
                      {doc.date && <p className="text-xs text-white/60">{doc.date}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {hasLink && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                          onClick={() => openLink(doc.lien)}
                          aria-label="Ouvrir le document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {isEditing && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                          onClick={() => removeDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
