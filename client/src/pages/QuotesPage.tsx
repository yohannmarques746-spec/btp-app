import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageWrapper } from "@/components/PageWrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDevis } from "@/hooks/useDevis";
import { EMPTY_PROFIL_ENTREPRISE, useProfilEntreprise } from "@/hooks/useProfilEntreprise";
import { DEFAULT_UNITE_PRESTATION, UNITE_OPTION_GROUPS, type UnitePrestationCode } from "@/constants/unitesPrestation";
import { calculateDateExpiration, calculateLigneTotalHT, calculateTotaux, computeDevisStatus, lignesAvecTotalHTCalcule } from "@/utils/devisCalculs";
import { formatCHF, sanitizeFileNamePart } from "@/utils/chf";
import { IDE_REGEX, validateDevis } from "@/utils/devisValidation";
import type { Devis, Emetteur, LignePrestation, StatutDevis, TauxTVA } from "@/types/devis";
import { DEVIS_STATUS_OPTIONS, TVA_OPTIONS } from "@/types/devis";
import { DevisPreview } from "@/components/devis/DevisPreview";
import { DevisPdfDocument } from "@/components/devis/DevisPdfDocument";
import { useChantiers } from "@/context/ChantiersContext";
import { useFactures } from "@/hooks/useFactures";
import { useLocation } from "wouter";
import { Copy, Download, Eye, FileText, Plus, Receipt, Save, Settings, Trash2, Wand2 } from "lucide-react";

type ModuleView = "dashboard" | "new" | "settings";

interface DevisFormValues {
  numero: string;
  dateEmission: string;
  dureeValidite: number;
  dateExpiration: string;
  objet: string;
  emetteur: Emetteur;
  client: {
    nom: string;
    adresse: string;
    npa: string;
    ville: string;
    email?: string;
    telephone?: string;
    contact?: string;
  };
  lignes: LignePrestation[];
  conditionsPaiement: string;
  delaiExecution?: string;
  notes?: string;
  devisPayant: boolean;
  montantDevis?: number;
  statut: StatutDevis;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateSafeId(context: string): string {
  return `${context}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createLigne(): LignePrestation {
  const generatedId = generateSafeId("ligne");

  return {
    id: generatedId,
    description: "",
    quantite: 1,
    unite: DEFAULT_UNITE_PRESTATION,
    prixUnitaireHT: 0,
    tauxTVA: 8.1,
    totalHT: 0,
  };
}

function createDefaults(profile: Emetteur, numero = `DEV-${new Date().getFullYear()}-0001`): DevisFormValues {
  const dateEmission = todayISO();
  const dureeValidite = 30;
  return {
    numero,
    dateEmission,
    dureeValidite,
    dateExpiration: calculateDateExpiration(dateEmission, dureeValidite),
    objet: "",
    emetteur: { ...profile },
    client: { nom: "", adresse: "", npa: "", ville: "", email: "", telephone: "", contact: "" },
    lignes: [createLigne()],
    conditionsPaiement: "30 jours net",
    delaiExecution: "",
    notes: "",
    devisPayant: false,
    montantDevis: undefined,
    statut: "brouillon",
  };
}

function statusLabel(status: StatutDevis): string {
  if (status === "envoye") return "Envoye";
  if (status === "accepte") return "Accepte";
  if (status === "refuse") return "Refuse";
  if (status === "expire") return "Expire";
  return "Brouillon";
}

function statusClasses(status: StatutDevis): string {
  if (status === "accepte") return "bg-emerald-500/20 text-emerald-300";
  if (status === "envoye") return "bg-blue-500/20 text-blue-300";
  if (status === "refuse") return "bg-red-500/20 text-red-300";
  if (status === "expire") return "bg-amber-500/20 text-amber-300";
  return "bg-slate-500/20 text-slate-300";
}

export default function QuotesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { clients, addClient } = useChantiers();
  const { devisList, saveDevis, deleteDevis: removeDevis, getNextNumeroDevis } = useDevis();
  const { factures, saveFacture } = useFactures();
  const { profile, saveProfile: saveProfileToDb } = useProfilEntreprise();
  const [activeView, setActiveView] = useState<ModuleView>("dashboard");
  const [editingDevisId, setEditingDevisId] = useState<string | null>(null);
  const [selectedQuoteRef, setSelectedQuoteRef] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingDevis, setIsSavingDevis] = useState(false);

  const profileForm = useForm<Emetteur>({ defaultValues: EMPTY_PROFIL_ENTREPRISE });
  const devisForm = useForm<DevisFormValues>({ defaultValues: createDefaults(EMPTY_PROFIL_ENTREPRISE), mode: "onChange" });
  const { fields, append, remove } = useFieldArray({ control: devisForm.control, name: "lignes" });

  const watched = devisForm.watch();
  const lignesWatch = useWatch({ control: devisForm.control, name: "lignes", defaultValue: [] as LignePrestation[] });

  useEffect(() => {
    profileForm.reset(profile);
  }, [profile, profileForm]);

  /** Ne pas réinitialiser tout le devis pendant que l'utilisateur est sur l'écran de saisie (client, lignes, etc.). */
  useEffect(() => {
    if (activeView === "new") return;
    let cancelled = false;
    void (async () => {
      const numero = await getNextNumeroDevis();
      if (cancelled) return;
      devisForm.reset(createDefaults(profile, numero));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeView, devisForm, getNextNumeroDevis, profile]);

  /** Si le profil arrive après l'ouverture de « Nouveau devis », préremplir l'émetteur vide. */
  useEffect(() => {
    if (activeView !== "new") return;
    const nomEmetteur = devisForm.getValues("emetteur.nom");
    if (!nomEmetteur?.trim() && profile.nom?.trim()) {
      devisForm.setValue("emetteur", { ...profile });
    }
  }, [activeView, devisForm, profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteRef = params.get("quoteRef");
    if (!quoteRef) return;
    setSelectedQuoteRef(quoteRef);
    setActiveView("dashboard");
    params.delete("quoteRef");
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `/dashboard/quotes?${nextQuery}` : "/dashboard/quotes";
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    const dateEmission = devisForm.getValues("dateEmission");
    const dureeValidite = Number(devisForm.getValues("dureeValidite") || 30);
    const nextExpiration = calculateDateExpiration(dateEmission, dureeValidite);
    if (devisForm.getValues("dateExpiration") !== nextExpiration) {
      devisForm.setValue("dateExpiration", nextExpiration);
    }
  }, [watched.dateEmission, watched.dureeValidite, devisForm]);

  const lignesPourTotaux = useMemo(() => lignesAvecTotalHTCalcule(lignesWatch ?? []), [lignesWatch]);

  useEffect(() => {
    const lignes = devisForm.getValues("lignes");
    lignes.forEach((ligne, index) => {
      const total = calculateLigneTotalHT(ligne);
      if (total !== ligne.totalHT) {
        devisForm.setValue(`lignes.${index}.totalHT`, total);
      }
    });
  }, [lignesWatch, devisForm]);

  const totals = useMemo(() => calculateTotaux(lignesPourTotaux), [lignesPourTotaux]);
  const filteredExistingClients = useMemo(
    () =>
      clients.filter((client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase())
      ),
    [clients, clientSearch]
  );

  const currentPreviewDevis: Devis = useMemo(() => {
    const now = new Date().toISOString();
    return {
      id: editingDevisId || "preview",
      numero: watched.numero || "-",
      dateEmission: watched.dateEmission || todayISO(),
      dureeValidite: Number(watched.dureeValidite || 30),
      dateExpiration: watched.dateExpiration || todayISO(),
      objet: watched.objet || "",
      emetteur: watched.emetteur || EMPTY_PROFIL_ENTREPRISE,
      client: watched.client || { nom: "", adresse: "", npa: "", ville: "" },
      lignes: lignesPourTotaux,
      sousTotalHT: totals.sousTotalHT,
      montantTVA: watched.emetteur?.nonAssujettiTVA ? 0 : totals.montantTVA,
      totalTTC: watched.emetteur?.nonAssujettiTVA ? totals.sousTotalHT : totals.totalTTC,
      conditionsPaiement: watched.conditionsPaiement || "",
      delaiExecution: watched.delaiExecution,
      notes: watched.notes,
      devisPayant: watched.devisPayant || false,
      montantDevis: watched.devisPayant ? Number(watched.montantDevis || 0) : undefined,
      statut: watched.statut || "brouillon",
      createdAt: now,
      updatedAt: now,
    };
  }, [editingDevisId, watched, totals, lignesPourTotaux]);

  const startNewDevis = () => {
    setEditingDevisId(null);
    setActiveView("new");
    void (async () => {
      const numero = await getNextNumeroDevis();
      devisForm.reset(createDefaults(profile, numero));
    })();
  };

  const saveDevisFromForm = async () => {
    const errors = validateDevis(currentPreviewDevis);
    if (!IDE_REGEX.test(currentPreviewDevis.emetteur.ide)) {
      errors.push("Numero IDE invalide (format CHE-XXX.XXX.XXX)");
    }
    if (errors.length > 0) {
      toast({ title: "Validation invalide", description: errors[0] });
      return;
    }

    setIsSavingDevis(true);
    const now = new Date().toISOString();
    const existing = editingDevisId ? devisList.find((d) => d.id === editingDevisId) : undefined;
    const payload: Devis = {
      ...currentPreviewDevis,
      id: editingDevisId || generateSafeId("devis"),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      statut: computeDevisStatus(currentPreviewDevis),
    };
    const { data, error } = await saveDevis(payload, editingDevisId ?? undefined);
    if (error) {
      setIsSavingDevis(false);
      toast({ title: "Erreur lors de l'enregistrement", description: error.message });
      return;
    }
    setEditingDevisId(data?.id ?? payload.id);
    setIsSavingDevis(false);
    toast({ title: "Devis enregistre", description: `${payload.numero} sauvegarde dans le dashboard.` });
    setActiveView("dashboard");
  };

  const editExistingDevis = (devis: Devis) => {
    devisForm.reset({
      numero: devis.numero,
      dateEmission: devis.dateEmission,
      dureeValidite: devis.dureeValidite,
      dateExpiration: devis.dateExpiration,
      objet: devis.objet,
      emetteur: devis.emetteur,
      client: devis.client,
      lignes: lignesAvecTotalHTCalcule(devis.lignes),
      conditionsPaiement: devis.conditionsPaiement,
      delaiExecution: devis.delaiExecution || "",
      notes: devis.notes || "",
      devisPayant: devis.devisPayant,
      montantDevis: devis.montantDevis,
      statut: devis.statut,
    });
    setEditingDevisId(devis.id);
    setActiveView("new");
  };

  const duplicateDevis = async (devis: Devis) => {
    const numero = await getNextNumeroDevis();
    const copy: Devis = {
      ...devis,
      id: generateSafeId("devis_copy"),
      numero,
      statut: "brouillon",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDevis(copy);
    toast({ title: "Devis duplique", description: `${copy.numero} cree.` });
  };

  const convertToFacture = async (devis: Devis) => {
    // Générer le prochain numéro de facture
    const year = new Date().getFullYear();
    const prefix = `FAC-${year}-`;
    const nums = factures
      .map((f) => f.numero)
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const numero = `${prefix}${String(max + 1).padStart(3, "0")}`;

    // Trouver le clientId à partir du nom du client du devis
    const matchedClient = clients.find(
      (c) => c.name.toLowerCase() === devis.client.nom.toLowerCase()
    );

    const today = new Date().toISOString().split("T")[0];
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);

    const { error } = await saveFacture({
      numero,
      devisId: devis.id,
      clientId: matchedClient?.id,
      dateEmission: today,
      dateEcheance: echeance.toISOString().split("T")[0],
      statut: "non_payee",
      lignes: devis.lignes,
      tvaTaux: 8.1,
      montantHT: devis.sousTotalHT,
      montantTVA: devis.montantTVA,
      montantTTC: devis.totalTTC,
      notes: `Facture issue du devis ${devis.numero}`,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Facture creee", description: `${numero} generee depuis ${devis.numero}` });
    setLocation("/dashboard/payments");
  };

  const deleteDevis = async (id: string) => {
    if (!window.confirm("Supprimer ce devis ?")) return;
    await removeDevis(id);
    toast({ title: "Devis supprime" });
  };

  const openPdfPreview = async (devis: Devis) => {
    const blob = await pdf(<DevisPdfDocument devis={devis} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const directDownloadPdf = async (devis: Devis) => {
    const blob = await pdf(<DevisPdfDocument devis={devis} />).toBlob();
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `Devis_${sanitizeFileNamePart(devis.numero)}_${sanitizeFileNamePart(devis.client.nom)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: "PDF telecharge", description: "Le devis a ete telecharge en PDF." });
  };

  const saveProfile = async (values: Emetteur) => {
    if (!IDE_REGEX.test(values.ide)) {
      toast({ title: "Numero IDE invalide", description: "Format attendu: CHE-123.456.789" });
      return;
    }
    setIsSavingProfile(true);
    const { error } = await saveProfileToDb(values);
    if (error) {
      setIsSavingProfile(false);
      toast({ title: "Erreur lors de l'enregistrement", description: error.message });
      return;
    }
    setIsSavingProfile(false);
    if (!editingDevisId) {
      devisForm.setValue("emetteur", values);
    }
    toast({ title: "Profil enregistre", description: "Le profil emetteur sera pre-rempli dans les nouveaux devis." });
  };

  const selectExistingClient = (clientId: string) => {
    const existing = clients.find((c) => c.id === clientId);
    if (!existing) return;
    devisForm.setValue("client.nom", existing.name);
    devisForm.setValue("client.email", existing.email || "");
    devisForm.setValue("client.telephone", existing.phone || "");
    devisForm.setValue("client.adresse", existing.adresse ?? "");
    devisForm.setValue("client.npa", existing.npa ?? "");
    devisForm.setValue("client.ville", existing.localite ?? "");
    setClientSearch(existing.name);
  };

  const addCurrentFormClientToDirectory = () => {
    const current = devisForm.getValues("client");
    if (!current.nom?.trim()) {
      toast({ title: "Nom client requis", description: "Renseigne le nom avant d'ajouter le client." });
      return;
    }

    const alreadyExists = clients.some(
      (c) => c.name.trim().toLowerCase() === current.nom.trim().toLowerCase()
    );
    if (alreadyExists) {
      toast({ title: "Client deja existant", description: "Ce client est deja present dans la liste." });
      return;
    }

    addClient({
      id: generateSafeId("client"),
      name: current.nom.trim(),
      email: current.email?.trim() || "",
      phone: current.telephone?.trim() || "",
      adresse: current.adresse?.trim() || "",
      npa: current.npa?.trim() || "",
      localite: current.ville?.trim() || "",
    });
    setClientSearch(current.nom.trim());
    toast({ title: "Client ajoute", description: "Le client est maintenant disponible dans la recherche." });
  };

  return (
    <PageWrapper mobileTitle="Devis">
      <header className="border-b border-white/10 bg-black/20 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-white">Generateur de Devis Suisse</h1>
            <p className="text-sm text-white/70">Dashboard | Nouveau Devis | Parametres</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={activeView === "dashboard" ? "default" : "outline"} onClick={() => setActiveView("dashboard")}>
              <FileText className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button variant={activeView === "new" ? "default" : "outline"} onClick={startNewDevis}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau devis
            </Button>
            <Button variant={activeView === "settings" ? "default" : "outline"} onClick={() => setActiveView("settings")}>
              <Settings className="mr-2 h-4 w-4" /> Parametres
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-3 py-3 md:px-6 md:py-6">
        {activeView === "dashboard" && (
          <div className="space-y-6">
            <Card className="bg-black/20 border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Wand2 className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Création de Devis par Robot IA
                </h2>
              </div>
              <p className="text-sm text-white/50 mb-4">
                Génère un devis complet en quelques secondes à partir des
                informations de ton chantier. Modifiable avant envoi.
              </p>
              <button
                type="button"
                onClick={() => startNewDevis()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                Générer un Devis avec l'IA
              </button>
            </Card>
            <Card className="bg-black/20 border-white/10 text-white">
            <CardHeader>
              <CardTitle>Liste des devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {devisList.length === 0 ? (
                <p className="text-white/70">Aucun devis enregistre pour le moment.</p>
              ) : (
                devisList.map((devis) => (
                  <div key={devis.id} className={`rounded-lg p-4 ${selectedQuoteRef === devis.numero ? "border border-yellow-300/60 bg-yellow-500/10" : "border border-white/10 bg-black/20"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{devis.numero}</p>
                        <p className="text-sm text-white/70">{devis.client.nom} • {devis.dateEmission}</p>
                        <p className="text-sm text-white/70">Total: {formatCHF(devis.totalTTC)}</p>
                      </div>
                      <Badge className={statusClasses(devis.statut)}>{statusLabel(devis.statut)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => editExistingDevis(devis)}><Eye className="mr-1 h-4 w-4" /> Voir</Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateDevis(devis)}><Copy className="mr-1 h-4 w-4" /> Dupliquer</Button>
                      {devis.statut === "accepte" && (
                        <Button size="sm" variant="outline" className="text-green-400 border-green-400/30 hover:bg-green-400/10" onClick={() => convertToFacture(devis)}><Receipt className="mr-1 h-4 w-4" /> Facturer</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openPdfPreview(devis)}><Eye className="mr-1 h-4 w-4" /> Apercu PDF</Button>
                      <Button size="sm" variant="outline" onClick={() => directDownloadPdf(devis)}><Download className="mr-1 h-4 w-4" /> Exporter PDF</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteDevis(devis.id)}><Trash2 className="mr-1 h-4 w-4" /> Supprimer</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {activeView === "settings" && (
          <Card className="bg-black/20 border-white/10 text-white">
            <CardHeader><CardTitle>Mon profil emetteur</CardTitle></CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit(saveProfile)}>
                <div><Label>Nom / Raison sociale</Label><Input {...profileForm.register("nom", { required: true })} className="bg-black/20 border-white/10" /></div>
                <div><Label>Adresse</Label><Input {...profileForm.register("adresse", { required: true })} className="bg-black/20 border-white/10" /></div>
                <div><Label>NPA</Label><Input {...profileForm.register("npa", { required: true })} className="bg-black/20 border-white/10" /></div>
                <div><Label>Ville</Label><Input {...profileForm.register("ville", { required: true })} className="bg-black/20 border-white/10" /></div>
                <div>
                  <Label>Numero IDE</Label>
                  <Input {...profileForm.register("ide", { required: true, pattern: IDE_REGEX })} className="bg-black/20 border-white/10" />
                  {profileForm.formState.errors.ide && <p className="mt-1 text-xs text-red-300">Format: CHE-123.456.789</p>}
                </div>
                <div><Label>Email</Label><Input type="email" {...profileForm.register("email", { required: true })} className="bg-black/20 border-white/10" /></div>
                <div><Label>Telephone</Label><Input {...profileForm.register("telephone", { required: true })} className="bg-black/20 border-white/10" /></div>
                <div><Label>IBAN (optionnel)</Label><Input {...profileForm.register("iban")} className="bg-black/20 border-white/10" /></div>
                <div className="md:col-span-2">
                  <Label>Logo (optionnel)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="bg-black/20 border-white/10"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => profileForm.setValue("logo", String(reader.result || ""));
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <Checkbox checked={Boolean(profileForm.watch("nonAssujettiTVA"))} onCheckedChange={(checked) => profileForm.setValue("nonAssujettiTVA", Boolean(checked))} />
                  <Label>Non assujetti a la TVA</Label>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={isSavingProfile}><Save className="mr-2 h-4 w-4" /> {isSavingProfile ? "Enregistrement..." : "Enregistrer le profil"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeView === "new" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="bg-black/20 border-white/10 text-white">
              <CardHeader>
                <CardTitle>{editingDevisId ? "Modifier le devis" : "Nouveau devis"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={devisForm.handleSubmit(saveDevisFromForm)}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><Label>Numero de devis</Label><Input {...devisForm.register("numero", { required: true })} className="bg-black/20 border-white/10" /></div>
                    <div><Label>Date d'emission</Label><Input type="date" {...devisForm.register("dateEmission", { required: true })} className="bg-black/20 border-white/10" /></div>
                    <div>
                      <Label>Duree de validite (jours)</Label>
                      <Select value={String(devisForm.watch("dureeValidite"))} onValueChange={(value) => devisForm.setValue("dureeValidite", Number(value))}>
                        <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>{[30, 60, 90].map((d) => <SelectItem key={d} value={String(d)}>{d} jours</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Date d'expiration</Label><Input value={devisForm.watch("dateExpiration")} readOnly className="bg-black/30 border-white/10" /></div>
                  </div>

                  <div>
                    <Label>Objet du devis</Label>
                    <Textarea rows={2} {...devisForm.register("objet")} className="bg-black/20 border-white/10" />
                  </div>

                  <div className="space-y-3 rounded-lg border border-white/10 p-4">
                    <p className="font-semibold">Emetteur</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input placeholder="Nom / Raison sociale" {...devisForm.register("emetteur.nom", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Adresse" {...devisForm.register("emetteur.adresse", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="NPA" {...devisForm.register("emetteur.npa", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Ville" {...devisForm.register("emetteur.ville", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="CHE-123.456.789" {...devisForm.register("emetteur.ide", { required: true, pattern: IDE_REGEX })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Email" {...devisForm.register("emetteur.email", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Telephone" {...devisForm.register("emetteur.telephone", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="IBAN (optionnel)" {...devisForm.register("emetteur.iban")} className="bg-black/20 border-white/10" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={Boolean(devisForm.watch("emetteur.nonAssujettiTVA"))} onCheckedChange={(checked) => devisForm.setValue("emetteur.nonAssujettiTVA", Boolean(checked))} />
                      <Label>Non assujetti a la TVA</Label>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-white/10 p-4">
                    <p className="font-semibold">Client</p>
                    <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-3">
                      <Label>Rechercher un client existant</Label>
                      <Input
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Tape le nom du client..."
                        className="bg-black/20 border-white/10"
                      />
                      <Select onValueChange={selectExistingClient}>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Selectionner un client existant" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredExistingClients.length > 0 ? (
                            filteredExistingClients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-white/60">Aucun client trouve</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input placeholder="Nom / Raison sociale" {...devisForm.register("client.nom", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Adresse" {...devisForm.register("client.adresse", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="NPA" {...devisForm.register("client.npa", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Ville" {...devisForm.register("client.ville", { required: true })} className="bg-black/20 border-white/10" />
                      <Input placeholder="Email" {...devisForm.register("client.email")} className="bg-black/20 border-white/10" />
                      <Input placeholder="Telephone" {...devisForm.register("client.telephone")} className="bg-black/20 border-white/10" />
                      <Input placeholder="Personne de contact" {...devisForm.register("client.contact")} className="bg-black/20 border-white/10 md:col-span-2" />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={addCurrentFormClientToDirectory}>
                        Ajouter comme nouveau client
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Lignes de prestations</p>
                      <Button type="button" size="sm" onClick={() => append(createLigne())}><Plus className="mr-1 h-4 w-4" /> Ajouter une ligne</Button>
                    </div>
                    <div className="hidden md:grid md:grid-cols-12 md:gap-3 md:px-3 md:pb-1 text-xs font-medium uppercase tracking-wide text-white/60">
                      <span className="md:col-span-4">Prestation</span>
                      <span className="md:col-span-1">Qté</span>
                      <span className="md:col-span-2">Unité</span>
                      <span className="md:col-span-2">PU HT</span>
                      <span className="md:col-span-1">TVA</span>
                      <span className="md:col-span-1">Total HT</span>
                      <span className="md:col-span-1" aria-hidden="true" />
                    </div>
                    {fields.map((field, index) => {
                      const ligneCourante = watched.lignes?.[index];
                      const totalLigneHT = ligneCourante ? calculateLigneTotalHT(ligneCourante) : 0;
                      return (
                        <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-12 md:items-end">
                          <div className="md:col-span-4 space-y-1">
                            <Label className="text-white/70 text-xs md:sr-only">Prestation (description)</Label>
                            <Input className="bg-black/20 border-white/10" placeholder="Ex. : Peinture murs salon" {...devisForm.register(`lignes.${index}.description` as const, { required: true })} />
                          </div>
                          <div className="md:col-span-1 space-y-1">
                            <Label className="text-white/70 text-xs md:sr-only">Quantité</Label>
                            <Input className="bg-black/20 border-white/10" type="number" min="0.01" step="0.01" {...devisForm.register(`lignes.${index}.quantite` as const, { valueAsNumber: true, min: 0.01 })} />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-white/70 text-xs md:sr-only">Unité</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={devisForm.watch(`lignes.${index}.unite`)}
                              onChange={(e) =>
                                devisForm.setValue(`lignes.${index}.unite`, e.target.value as UnitePrestationCode)
                              }
                            >
                              {UNITE_OPTION_GROUPS.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.options.map((opt) => (
                                    <option key={opt.code} value={opt.code}>
                                      {opt.code} — {opt.libelle}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-white/70 text-xs md:sr-only">Prix unitaire HT</Label>
                            <Input className="bg-black/20 border-white/10" type="number" min="0.01" step="0.01" {...devisForm.register(`lignes.${index}.prixUnitaireHT` as const, { valueAsNumber: true, min: 0.01 })} />
                          </div>
                          <div className="md:col-span-1 space-y-1">
                            <Label className="text-white/70 text-xs md:sr-only">TVA</Label>
                            <Select value={String(devisForm.watch(`lignes.${index}.tauxTVA`))} onValueChange={(v) => devisForm.setValue(`lignes.${index}.tauxTVA`, Number(v) as TauxTVA)}>
                              <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                              <SelectContent>{TVA_OPTIONS.map((t) => <SelectItem key={String(t)} value={String(t)}>{t}%</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-1 space-y-1">
                            <Label className="text-white/70 text-xs md:sr-only">Total ligne HT (Qté × PU HT)</Label>
                            <Input className="bg-black/30 border-white/10" value={formatCHF(totalLigneHT)} readOnly tabIndex={-1} aria-readonly="true" />
                          </div>
                          <div className="flex md:col-span-1 md:justify-end">
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Supprimer la ligne">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-white/10 p-4">
                    <p className="mb-2 font-semibold">Recapitulatif financier</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Sous-total HT</span><span>{formatCHF(totals.sousTotalHT)}</span></div>
                      {(watched.emetteur?.nonAssujettiTVA ? [] : totals.tvaParTaux).map((t) => (
                        <div key={String(t.taux)} className="flex justify-between"><span>TVA {t.taux}%</span><span>{formatCHF(t.montantTVA)}</span></div>
                      ))}
                      <div className="flex justify-between font-semibold text-white">
                        <span>Total TTC</span>
                        <span>{formatCHF(watched.emetteur?.nonAssujettiTVA ? totals.sousTotalHT : totals.totalTTC)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-white/10 p-4">
                    <p className="font-semibold">Conditions & notes</p>
                    <Input placeholder="Conditions de paiement" {...devisForm.register("conditionsPaiement")} className="bg-black/20 border-white/10" />
                    <Input placeholder="Delai d'execution estime" {...devisForm.register("delaiExecution")} className="bg-black/20 border-white/10" />
                    <Textarea placeholder="Notes / Remarques" rows={3} {...devisForm.register("notes")} className="bg-black/20 border-white/10" />
                    <div className="flex items-center gap-2">
                      <Checkbox checked={Boolean(watched.devisPayant)} onCheckedChange={(checked) => devisForm.setValue("devisPayant", Boolean(checked))} />
                      <Label>Devis payant</Label>
                    </div>
                    {watched.devisPayant && (
                      <Input type="number" min="0" step="0.01" placeholder="Montant du devis (CHF)" {...devisForm.register("montantDevis", { valueAsNumber: true })} className="bg-black/20 border-white/10" />
                    )}
                    <div>
                      <Label>Statut</Label>
                      <Select value={watched.statut} onValueChange={(value) => devisForm.setValue("statut", value as StatutDevis)}>
                        <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>{DEVIS_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isSavingDevis}><Save className="mr-2 h-4 w-4" /> {isSavingDevis ? "Enregistrement..." : "Enregistrer"}</Button>
                    <Button type="button" variant="outline" onClick={() => openPdfPreview(currentPreviewDevis)}><Eye className="mr-2 h-4 w-4" /> Apercu PDF</Button>
                    <PDFDownloadLink
                      document={<DevisPdfDocument devis={currentPreviewDevis} />}
                      fileName={`Devis_${sanitizeFileNamePart(currentPreviewDevis.numero)}_${sanitizeFileNamePart(currentPreviewDevis.client.nom)}.pdf`}
                      onClick={() => toast({ title: "Telechargement PDF", description: "Le telechargement va demarrer." })}
                      className="inline-flex h-9 items-center rounded-md border border-white/20 px-4 text-sm font-medium hover:bg-white/10"
                    >
                      <Download className="mr-2 h-4 w-4" /> Telecharger directement
                    </PDFDownloadLink>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10 text-white">
              <CardHeader><CardTitle>Previsualisation live</CardTitle></CardHeader>
              <CardContent>
                <DevisPreview devis={currentPreviewDevis} />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </PageWrapper>
  );
}
