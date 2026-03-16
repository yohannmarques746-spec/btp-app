import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { calculateDateExpiration, calculateLigneTotalHT, calculateTotaux, computeDevisStatus } from "@/utils/devisCalculs";
import { formatCHF, sanitizeFileNamePart } from "@/utils/chf";
import { DEFAULT_EMETTEUR, getNextNumeroDevis, loadDevisList, loadProfilEmetteur, saveDevisList, saveProfilEmetteur } from "@/utils/devisStorage";
import { IDE_REGEX, validateDevis } from "@/utils/devisValidation";
import type { Devis, Emetteur, LignePrestation, StatutDevis, TauxTVA, UnitePrestation } from "@/types/devis";
import { DEVIS_STATUS_OPTIONS, TVA_OPTIONS, UNITE_OPTIONS } from "@/types/devis";
import { DevisPreview } from "@/components/devis/DevisPreview";
import { DevisPdfDocument } from "@/components/devis/DevisPdfDocument";
import { useChantiers } from "@/context/ChantiersContext";
import { Copy, Download, Eye, FileText, Plus, Save, Settings, Trash2 } from "lucide-react";

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

function sendDebugLog(hypothesisId: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'quotes-randomuuid-debug-1',hypothesisId,location:'client/src/pages/QuotesPage.tsx:createLigne',message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

function generateSafeId(context: string): string {
  const fallbackId = `${context}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  // #region agent log
  sendDebugLog("H4", "safe id generated without crypto", { context, idPreview: fallbackId.slice(0, 16) });
  // #endregion
  return fallbackId;
}

function createLigne(): LignePrestation {
  // #region agent log
  sendDebugLog("H1", "createLigne runtime capabilities", {
    hasCrypto: typeof crypto !== "undefined",
    randomUUIDType: typeof crypto !== "undefined" ? typeof (crypto as { randomUUID?: unknown }).randomUUID : "no-crypto",
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext : null,
  });
  // #endregion

  const generatedId = generateSafeId("ligne");

  return {
    id: generatedId,
    description: "",
    quantite: 1,
    unite: "heure",
    prixUnitaireHT: 0,
    tauxTVA: 8.1,
    totalHT: 0,
  };
}

function createDefaults(profile: Emetteur): DevisFormValues {
  const dateEmission = todayISO();
  const dureeValidite = 30;
  return {
    numero: getNextNumeroDevis(),
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
  const { clients, addClient } = useChantiers();
  const [activeView, setActiveView] = useState<ModuleView>("dashboard");
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [editingDevisId, setEditingDevisId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Emetteur>(DEFAULT_EMETTEUR);
  const [clientSearch, setClientSearch] = useState("");

  const profileForm = useForm<Emetteur>({ defaultValues: DEFAULT_EMETTEUR });
  const devisForm = useForm<DevisFormValues>({ defaultValues: createDefaults(DEFAULT_EMETTEUR), mode: "onChange" });
  const { fields, append, remove } = useFieldArray({ control: devisForm.control, name: "lignes" });

  const watched = devisForm.watch();

  useEffect(() => {
    // #region agent log
    sendDebugLog("H6", "quotes page mounted", {
      href: typeof window !== "undefined" ? window.location.href : null,
      hasCrypto: typeof crypto !== "undefined",
      randomUUIDType: typeof crypto !== "undefined" ? typeof (crypto as { randomUUID?: unknown }).randomUUID : "no-crypto",
    });
    // #endregion

    const onError = (event: ErrorEvent) => {
      // #region agent log
      sendDebugLog("H7", "window error event", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      // #endregion
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // #region agent log
      sendDebugLog("H8", "unhandled rejection", {
        reason: String(event.reason),
      });
      // #endregion
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const loadedProfile = loadProfilEmetteur();
    const loadedDevis = loadDevisList();
    setProfile(loadedProfile);
    setDevisList(loadedDevis);
    profileForm.reset(loadedProfile);
    devisForm.reset(createDefaults(loadedProfile));
  }, [devisForm, profileForm]);

  useEffect(() => {
    const dateEmission = devisForm.getValues("dateEmission");
    const dureeValidite = Number(devisForm.getValues("dureeValidite") || 30);
    const nextExpiration = calculateDateExpiration(dateEmission, dureeValidite);
    if (devisForm.getValues("dateExpiration") !== nextExpiration) {
      devisForm.setValue("dateExpiration", nextExpiration);
    }
  }, [watched.dateEmission, watched.dureeValidite, devisForm]);

  useEffect(() => {
    const lignes = devisForm.getValues("lignes");
    lignes.forEach((ligne, index) => {
      const total = calculateLigneTotalHT(ligne);
      if (total !== ligne.totalHT) {
        devisForm.setValue(`lignes.${index}.totalHT`, total);
      }
    });
  }, [watched.lignes, devisForm]);

  const totals = useMemo(() => calculateTotaux(watched.lignes || []), [watched.lignes]);
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
      emetteur: watched.emetteur || DEFAULT_EMETTEUR,
      client: watched.client || { nom: "", adresse: "", npa: "", ville: "" },
      lignes: watched.lignes || [],
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
  }, [editingDevisId, watched, totals]);

  const startNewDevis = () => {
    const defaults = createDefaults(profile);
    devisForm.reset(defaults);
    setEditingDevisId(null);
    setActiveView("new");
  };

  const saveDevisFromForm = () => {
    const errors = validateDevis(currentPreviewDevis);
    if (!IDE_REGEX.test(currentPreviewDevis.emetteur.ide)) {
      errors.push("Numero IDE invalide (format CHE-XXX.XXX.XXX)");
    }
    if (errors.length > 0) {
      toast({ title: "Validation invalide", description: errors[0] });
      return;
    }

    const now = new Date().toISOString();
    const existing = editingDevisId ? devisList.find((d) => d.id === editingDevisId) : undefined;
    const payload: Devis = {
      ...currentPreviewDevis,
      id: editingDevisId || generateSafeId("devis"),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      statut: computeDevisStatus(currentPreviewDevis),
    };

    const nextList = editingDevisId
      ? devisList.map((d) => (d.id === editingDevisId ? payload : d))
      : [payload, ...devisList];

    saveDevisList(nextList);
    setDevisList(nextList);
    setEditingDevisId(payload.id);
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
      lignes: devis.lignes,
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

  const duplicateDevis = (devis: Devis) => {
    const copy: Devis = {
      ...devis,
      id: generateSafeId("devis_copy"),
      numero: getNextNumeroDevis(),
      statut: "brouillon",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = [copy, ...devisList];
    saveDevisList(nextList);
    setDevisList(nextList);
    toast({ title: "Devis duplique", description: `${copy.numero} cree.` });
  };

  const deleteDevis = (id: string) => {
    if (!window.confirm("Supprimer ce devis ?")) return;
    const nextList = devisList.filter((d) => d.id !== id);
    saveDevisList(nextList);
    setDevisList(nextList);
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

  const saveProfile = (values: Emetteur) => {
    if (!IDE_REGEX.test(values.ide)) {
      toast({ title: "Numero IDE invalide", description: "Format attendu: CHE-123.456.789" });
      return;
    }
    saveProfilEmetteur(values);
    setProfile(values);
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
    });
    setClientSearch(current.nom.trim());
    toast({ title: "Client ajoute", description: "Le client est maintenant disponible dans la recherche." });
  };

  return (
    <PageWrapper>
      <header className="border-b border-white/10 bg-black/20 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Generateur de Devis Suisse</h1>
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

      <main className="flex-1 overflow-auto p-6">
        {activeView === "dashboard" && (
          <Card className="bg-black/20 border-white/10 text-white">
            <CardHeader>
              <CardTitle>Liste des devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {devisList.length === 0 ? (
                <p className="text-white/70">Aucun devis enregistre pour le moment.</p>
              ) : (
                devisList.map((devis) => (
                  <div key={devis.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
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
                      <Button size="sm" variant="outline" onClick={() => openPdfPreview(devis)}><Eye className="mr-1 h-4 w-4" /> Apercu PDF</Button>
                      <Button size="sm" variant="outline" onClick={() => directDownloadPdf(devis)}><Download className="mr-1 h-4 w-4" /> Exporter PDF</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteDevis(devis.id)}><Trash2 className="mr-1 h-4 w-4" /> Supprimer</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
                  <Button type="submit"><Save className="mr-2 h-4 w-4" /> Enregistrer le profil</Button>
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
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-12">
                        <Input className="md:col-span-4 bg-black/20 border-white/10" placeholder="Description" {...devisForm.register(`lignes.${index}.description` as const, { required: true })} />
                        <Input className="md:col-span-1 bg-black/20 border-white/10" type="number" min="0.01" step="0.01" {...devisForm.register(`lignes.${index}.quantite` as const, { valueAsNumber: true, min: 0.01 })} />
                        <Select value={devisForm.watch(`lignes.${index}.unite`)} onValueChange={(v) => devisForm.setValue(`lignes.${index}.unite`, v as UnitePrestation)}>
                          <SelectTrigger className="md:col-span-2 bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent>{UNITE_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="md:col-span-2 bg-black/20 border-white/10" type="number" min="0.01" step="0.01" {...devisForm.register(`lignes.${index}.prixUnitaireHT` as const, { valueAsNumber: true, min: 0.01 })} />
                        <Select value={String(devisForm.watch(`lignes.${index}.tauxTVA`))} onValueChange={(v) => devisForm.setValue(`lignes.${index}.tauxTVA`, Number(v) as TauxTVA)}>
                          <SelectTrigger className="md:col-span-1 bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent>{TVA_OPTIONS.map((t) => <SelectItem key={String(t)} value={String(t)}>{t}%</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="md:col-span-1 bg-black/30 border-white/10" value={formatCHF(Number(devisForm.watch(`lignes.${index}.totalHT`) || 0))} readOnly />
                        <Button type="button" variant="destructive" size="icon" className="md:col-span-1" onClick={() => remove(index)} disabled={fields.length === 1}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
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
                    <Button type="submit"><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
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
