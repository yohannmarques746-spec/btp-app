import { useEffect, useMemo, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";

import { PageWrapper } from "@/components/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Euro,
  Eye,
  EyeOff,
  FileText,
  FileDown,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import { useFactures, type FactureStatus } from "@/hooks/useFactures";
import { useClients } from "@/hooks/useClients";
import { useProfilEntreprise } from "@/hooks/useProfilEntreprise";
import { useToast } from "@/hooks/use-toast";

import { FacturePdfDocument, type LigneFacturePdf } from "@/components/facture/FacturePdfDocument";
import { FacturePreview } from "@/components/facture/FacturePreview";

import { calculateTVAParTaux, calculateLigneTotalHT } from "@/utils/devisCalculs";
import { formatCHF, sanitizeFileNamePart } from "@/utils/chf";
import type { TauxTVA, LignePrestation } from "@/types/devis";
import { TVA_OPTIONS } from "@/types/devis";
import { UNITE_OPTION_GROUPS, DEFAULT_UNITE_PRESTATION } from "@/constants/unitesPrestation";
import { useCataloguePrestations } from "@/hooks/useCataloguePrestations";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface LigneForm {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA: TauxTVA;
  totalHT: number;
}

interface FactureFormState {
  numero: string;
  clientId: string;
  objet: string;
  dateEmission: string;
  dateEcheance: string;
  statut: FactureStatus;
  lignes: LigneForm[];
  notes: string;
  conditionsPaiement: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function nextNumero(existingNumeros: string[]): string {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const nums = existingNumeros
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function emptyLigne(): LigneForm {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantite: 1,
    unite: DEFAULT_UNITE_PRESTATION,
    prixUnitaireHT: 0,
    tauxTVA: 8.1,
    totalHT: 0,
  };
}

function emptyForm(numero: string): FactureFormState {
  const today = todayISO();
  return {
    numero,
    clientId: "",
    objet: "",
    dateEmission: today,
    dateEcheance: addDays(today, 30),
    statut: "non_payee",
    lignes: [emptyLigne()],
    notes: "",
    conditionsPaiement: "30 jours net",
  };
}

function StatusBadge({ statut }: { statut: FactureStatus }) {
  if (statut === "payee")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Payée
      </span>
    );
  if (statut === "en_retard")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
        <XCircle className="h-3 w-3" /> En retard
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300">
      <Clock className="h-3 w-3" /> Non payée
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { toast } = useToast();
  const { factures, loading, saveFacture, deleteFacture } = useFactures();
  const { clients } = useClients();
  const { profile: emetteur } = useProfilEntreprise();
  const { catalogue } = useCataloguePrestations();

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FactureFormState>(() => emptyForm("FAC-2026-001"));
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedFactureRef, setSelectedFactureRef] = useState<string | null>(null);

  // Détecter la référence en URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("factureRef");
    if (!ref) return;
    setSelectedFactureRef(ref);
    params.delete("factureRef");
    const next = params.toString();
    window.history.replaceState({}, "", next ? `/dashboard/payments?${next}` : "/dashboard/payments");
  }, []);

  // Auto-statut en retard
  const facturesWithAutoStatus = useMemo(() => {
    const today = todayISO();
    return factures.map((f) => {
      if (f.statut === "payee") return f;
      if (f.dateEcheance && f.dateEcheance < today) return { ...f, statut: "en_retard" as FactureStatus };
      return f;
    });
  }, [factures]);

  // Dashboard stats
  const stats = useMemo(() => {
    const total = facturesWithAutoStatus.reduce((s, f) => s + f.montantTTC, 0);
    const payee = facturesWithAutoStatus.filter((f) => f.statut === "payee").reduce((s, f) => s + f.montantTTC, 0);
    const retard = facturesWithAutoStatus.filter((f) => f.statut === "en_retard").reduce((s, f) => s + f.montantTTC, 0);
    const enAttente = facturesWithAutoStatus.filter((f) => f.statut === "non_payee").reduce((s, f) => s + f.montantTTC, 0);
    return { total, payee, retard, enAttente };
  }, [facturesWithAutoStatus]);

  // Calculs en temps réel depuis les lignes
  const lignesCalculees = useMemo<LignePrestation[]>(
    () =>
      form.lignes.map((l) => ({
        ...l,
        unite: l.unite as LignePrestation["unite"],
        totalHT: calculateLigneTotalHT({ quantite: l.quantite, prixUnitaireHT: l.prixUnitaireHT }),
      })),
    [form.lignes]
  );

  const tvaParTaux = useMemo(() => calculateTVAParTaux(lignesCalculees), [lignesCalculees]);
  const sousTotalHT = useMemo(
    () => Number(lignesCalculees.reduce((s, l) => s + l.totalHT, 0).toFixed(2)),
    [lignesCalculees]
  );
  const montantTVA = useMemo(
    () => Number(tvaParTaux.reduce((s, t) => s + t.montantTVA, 0).toFixed(2)),
    [tvaParTaux]
  );
  const totalTTC = useMemo(() => Number((sousTotalHT + montantTVA).toFixed(2)), [sousTotalHT, montantTVA]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId) ?? null,
    [clients, form.clientId]
  );

  // Props partagées PDF / Preview
  const pdfLignes: LigneFacturePdf[] = lignesCalculees.map((l) => ({
    id: l.id,
    description: l.description,
    quantite: l.quantite,
    unite: l.unite,
    prixUnitaireHT: l.prixUnitaireHT,
    tauxTVA: l.tauxTVA,
    totalHT: l.totalHT,
  }));

  const pdfClient = {
    nom: selectedClient
      ? `${selectedClient.name}${selectedClient.prenom ? " " + selectedClient.prenom : ""}`
      : "",
    adresse: selectedClient?.adresse ?? "",
    npa: selectedClient?.npa ?? "",
    ville: selectedClient?.localite ?? "",
    email: selectedClient?.email,
    telephone: selectedClient?.phone,
  };

  const pdfProps = {
    numero: form.numero,
    dateEmission: form.dateEmission,
    dateEcheance: form.dateEcheance,
    objet: form.objet,
    lignes: pdfLignes,
    notes: form.notes,
    conditionsPaiement: form.conditionsPaiement,
    emetteur,
    client: pdfClient,
    sousTotalHT,
    tvaParTaux,
    montantTVA,
    totalTTC,
  };

  function addFromCatalogue(prestationId: string) {
    const p = catalogue.find((c) => c.id === prestationId);
    if (!p) return;
    const newLigne: LigneForm = {
      id: crypto.randomUUID(),
      description: p.description,
      quantite: 1,
      unite: p.unite,
      prixUnitaireHT: p.prixUnitaireHT,
      tauxTVA: p.tauxTVA,
      totalHT: p.prixUnitaireHT,
    };
    setForm((prev) => ({ ...prev, lignes: [...prev.lignes, newLigne] }));
  }

  function exportCSV() {
    const header = "Numéro;Client;Date émission;Date échéance;Statut;Montant HT;Montant TVA;Montant TTC";
    const rows = facturesWithAutoStatus.map((f) => {
      const clientName = clients.find((c) => c.id === f.clientId)?.name ?? "";
      return `${f.numero};${clientName};${f.dateEmission ?? ""};${f.dateEcheance ?? ""};${f.statut};${f.montantHT.toFixed(2)};${f.montantTVA.toFixed(2)};${f.montantTTC.toFixed(2)}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Ouvrir formulaire vide
  function openNew() {
    const numero = nextNumero(factures.map((f) => f.numero));
    setForm(emptyForm(numero));
    setEditId(null);
    setMode("form");
  }

  // Ouvrir formulaire en édition
  function openEdit(factureId: string) {
    const f = factures.find((x) => x.id === factureId);
    if (!f) return;
    const lignes = (Array.isArray(f.lignes) && f.lignes.length > 0
      ? f.lignes
      : [emptyLigne()]) as LigneForm[];
    setForm({
      numero: f.numero,
      clientId: f.clientId ?? "",
      objet: "",
      dateEmission: f.dateEmission ?? todayISO(),
      dateEcheance: f.dateEcheance ?? addDays(todayISO(), 30),
      statut: f.statut,
      lignes,
      notes: f.notes ?? "",
      conditionsPaiement: "30 jours net",
    });
    setEditId(factureId);
    setMode("form");
  }

  function updateLigne(idx: number, field: keyof LigneForm, value: string | number) {
    setForm((prev) => {
      const lignes = prev.lignes.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: value };
        updated.totalHT = calculateLigneTotalHT({
          quantite: Number(updated.quantite),
          prixUnitaireHT: Number(updated.prixUnitaireHT),
        });
        return updated;
      });
      return { ...prev, lignes };
    });
  }

  function addLigne() {
    setForm((prev) => ({ ...prev, lignes: [...prev.lignes, emptyLigne()] }));
  }

  function removeLigne(idx: number) {
    setForm((prev) => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.numero.trim()) {
      toast({ title: "Numéro requis", description: "Veuillez saisir un numéro de facture." });
      return;
    }
    setIsSaving(true);
    const { error } = await saveFacture(
      {
        numero: form.numero.trim(),
        clientId: form.clientId || undefined,
        dateEmission: form.dateEmission || undefined,
        dateEcheance: form.dateEcheance || undefined,
        statut: form.statut,
        lignes: lignesCalculees,
        tvaTaux: 8.1,
        montantHT: sousTotalHT,
        montantTVA,
        montantTTC: totalTTC,
        notes: form.notes || undefined,
        devisId: undefined,
      },
      editId ?? undefined
    );
    setIsSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message });
      return;
    }
    toast({ title: editId ? "Facture modifiée ✓" : "Facture enregistrée ✓" });
    setMode("list");
    setEditId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette facture ?")) return;
    await deleteFacture(id);
    toast({ title: "Facture supprimée" });
  }

  return (
    <PageWrapper mobileTitle="Factures">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode === "form" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setMode("list"); setEditId(null); }}
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold md:text-2xl text-white flex items-center gap-2">
                <Euro className="h-5 w-5 text-green-400" />
                {mode === "form" ? (editId ? `Modifier ${form.numero}` : "Nouvelle facture") : "Factures"}
              </h1>
              <p className="text-sm text-white/60">
                {mode === "form"
                  ? "Remplissez les informations de la facture"
                  : "Génération et suivi de vos factures"}
              </p>
            </div>
          </div>
          {mode === "list" && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCSV} className="border-white/20 text-white hover:bg-white/10">
                <FileDown className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">CSV</span>
              </Button>
              <Button onClick={openNew} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Nouvelle facture</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">

        {/* ── MODE LISTE ── */}
        {mode === "list" && (
          <div className="space-y-6">

            {/* Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total facturé", value: stats.total, color: "text-blue-400", icon: <FileText className="h-4 w-4" /> },
                { label: "Payé", value: stats.payee, color: "text-green-400", icon: <CheckCircle2 className="h-4 w-4" /> },
                { label: "En attente", value: stats.enAttente, color: "text-yellow-300", icon: <Clock className="h-4 w-4" /> },
                { label: "En retard", value: stats.retard, color: "text-red-400", icon: <XCircle className="h-4 w-4" /> },
              ].map((card) => (
                <Card key={card.label} className="bg-black/20 border-white/10 text-white">
                  <CardContent className="p-4">
                    <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${card.color}`}>
                      {card.icon} {card.label}
                    </div>
                    <p className="text-xl font-bold">{formatCHF(card.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Liste */}
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Vos factures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-white/50 text-sm">Chargement…</p>
                ) : facturesWithAutoStatus.length === 0 ? (
                  <div className="text-center py-10 text-white/40">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Aucune facture. Créez-en une !</p>
                  </div>
                ) : (
                  facturesWithAutoStatus.map((f) => {
                    const clientName = clients.find((c) => c.id === f.clientId)?.name ?? "—";
                    return (
                      <div
                        key={f.id}
                        className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                          selectedFactureRef === f.numero
                            ? "border-yellow-300/60 bg-yellow-500/10"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{f.numero}</p>
                            <StatusBadge statut={f.statut} />
                          </div>
                          <p className="text-xs text-white/60 mt-0.5">
                            {clientName}
                            {f.dateEcheance ? ` · Échéance : ${f.dateEcheance}` : ""}
                          </p>
                          <p className="text-sm font-bold text-green-400 mt-1">{formatCHF(f.montantTTC)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/60 hover:text-white"
                            onClick={() => openEdit(f.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400/70 hover:text-red-400"
                            onClick={() => void handleDelete(f.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── MODE FORMULAIRE ── */}
        {mode === "form" && (
          <div className={`grid gap-6 ${showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>

            {/* Colonne formulaire */}
            <div className="space-y-4">

              {/* Infos générales */}
              <Card className="bg-black/20 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base text-white">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Numéro</Label>
                    <Input
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      className="bg-black/20 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Statut</Label>
                    <select
                      value={form.statut}
                      onChange={(e) => setForm({ ...form, statut: e.target.value as FactureStatus })}
                      className="w-full h-9 rounded-md border bg-black/20 border-white/10 text-white px-3 text-sm"
                    >
                      <option value="non_payee">Non payée</option>
                      <option value="payee">Payée</option>
                      <option value="en_retard">En retard</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-white/80">Date d'émission</Label>
                    <Input
                      type="date"
                      value={form.dateEmission}
                      onChange={(e) => setForm({ ...form, dateEmission: e.target.value })}
                      className="bg-black/20 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Date d'échéance</Label>
                    <Input
                      type="date"
                      value={form.dateEcheance}
                      onChange={(e) => setForm({ ...form, dateEcheance: e.target.value })}
                      className="bg-black/20 border-white/10 text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-white/80">Client</Label>
                    <select
                      value={form.clientId}
                      onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                      className="w-full h-9 rounded-md border bg-black/20 border-white/10 text-white px-3 text-sm"
                    >
                      <option value="">— Sélectionner un client —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.prenom ? ` ${c.prenom}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-white/80">Objet / Description</Label>
                    <Input
                      placeholder="Ex : Travaux de plâtrerie – Appartement 3B"
                      value={form.objet}
                      onChange={(e) => setForm({ ...form, objet: e.target.value })}
                      className="bg-black/20 border-white/10 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Lignes de prestation */}
              <Card className="bg-black/20 border-white/10 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-white">Prestations</CardTitle>
                    <div className="flex gap-2">
                      {catalogue.length > 0 && (
                        <select
                          onChange={(e) => { if (e.target.value) { addFromCatalogue(e.target.value); e.target.value = ""; } }}
                          className="h-8 rounded-md border bg-black/30 border-white/10 text-white px-2 text-xs"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Catalogue...
                          </option>
                          {catalogue.map((p) => (
                            <option key={p.id} value={p.id}>{p.description}</option>
                          ))}
                        </select>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addLigne}
                        className="border-white/20 text-white hover:bg-white/10 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.lignes.map((ligne, idx) => (
                    <div key={ligne.id} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Prestation {idx + 1}</span>
                        {form.lignes.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400/70 hover:text-red-400"
                            onClick={() => removeLigne(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Description de la prestation"
                        value={ligne.description}
                        onChange={(e) => updateLigne(idx, "description", e.target.value)}
                        className="bg-black/30 border-white/10 text-white text-sm"
                      />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-white/50">Quantité</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ligne.quantite}
                            onChange={(e) => updateLigne(idx, "quantite", parseFloat(e.target.value) || 0)}
                            className="bg-black/30 border-white/10 text-white text-sm h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-white/50">Unité</Label>
                          <select
                            value={ligne.unite}
                            onChange={(e) => updateLigne(idx, "unite", e.target.value)}
                            className="w-full h-8 rounded-md border bg-black/30 border-white/10 text-white px-2 text-sm"
                          >
                            {UNITE_OPTION_GROUPS.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((o) => (
                                  <option key={o.code} value={o.code}>{o.code}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-white/50">PU HT (CHF)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ligne.prixUnitaireHT}
                            onChange={(e) => updateLigne(idx, "prixUnitaireHT", parseFloat(e.target.value) || 0)}
                            className="bg-black/30 border-white/10 text-white text-sm h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-white/50">TVA %</Label>
                          <select
                            value={ligne.tauxTVA}
                            onChange={(e) => updateLigne(idx, "tauxTVA", parseFloat(e.target.value) as TauxTVA)}
                            className="w-full h-8 rounded-md border bg-black/30 border-white/10 text-white px-2 text-sm"
                          >
                            {TVA_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}%</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="text-right text-xs text-white/60">
                        Total HT :{" "}
                        <span className="font-semibold text-white">
                          {formatCHF(
                            calculateLigneTotalHT({
                              quantite: ligne.quantite,
                              prixUnitaireHT: ligne.prixUnitaireHT,
                            })
                          )}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Récap totaux */}
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-white/70">
                      <span>Sous-total HT</span>
                      <span>{formatCHF(sousTotalHT)}</span>
                    </div>
                    {tvaParTaux.map((t) => (
                      <div key={String(t.taux)} className="flex justify-between text-white/70">
                        <span>TVA {t.taux}%</span>
                        <span>{formatCHF(t.montantTVA)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-base font-bold border-t border-white/20 pt-2 text-white">
                      <span>Total TTC</span>
                      <span className="text-green-400">{formatCHF(totalTTC)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Conditions & Notes */}
              <Card className="bg-black/20 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base text-white">Conditions & Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-white/80">Conditions de paiement</Label>
                    <Input
                      placeholder="Ex : 30 jours net"
                      value={form.conditionsPaiement}
                      onChange={(e) => setForm({ ...form, conditionsPaiement: e.target.value })}
                      className="bg-black/20 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Notes</Label>
                    <textarea
                      placeholder="Informations complémentaires…"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border border-white/10 bg-black/20 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-white/30"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? "Enregistrement…" : editId ? "Mettre à jour" : "Enregistrer la facture"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview((v) => !v)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showPreview ? "Masquer aperçu" : "Aperçu PDF"}
                </Button>
                <PDFDownloadLink
                  document={<FacturePdfDocument {...pdfProps} />}
                  fileName={`Facture_${sanitizeFileNamePart(form.numero)}${
                    selectedClient ? "_" + sanitizeFileNamePart(selectedClient.name) : ""
                  }.pdf`}
                  className="inline-flex h-9 items-center rounded-md border border-white/20 px-4 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  {({ loading: pdfLoading }) =>
                    pdfLoading ? (
                      "Génération PDF…"
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" /> Télécharger PDF
                      </>
                    )
                  }
                </PDFDownloadLink>
              </div>
            </div>

            {/* Colonne aperçu */}
            {showPreview && (
              <div>
                <p className="text-xs text-white/50 mb-2 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Aperçu en temps réel
                </p>
                <FacturePreview {...pdfProps} />
              </div>
            )}
          </div>
        )}
      </main>
    </PageWrapper>
  );
}