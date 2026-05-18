import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DollarSign, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DevisAutocompleteInput } from "@/components/chantier/DevisAutocompleteInput";
import { FactureAutocompleteInput } from "@/components/chantier/FactureAutocompleteInput";
import { formatCHF } from "@/utils/chf";
import type { ChantierDetails, LigneFinanciere } from "@/types/chantierDetails";

type FinancialData = NonNullable<ChantierDetails["financier"]>;

interface FinancialSectionProps {
  data?: FinancialData;
  /** Sert à filtrer les factures proposées (factures du client courant). */
  clientId?: string;
  onSave: (next: FinancialData) => void;
}

interface FinancialFormData {
  montantDevisHT: string;
  tvaPercent: number;
  montantFacture: string;
  acomptesRecus: string;
  devisId: string | null;
  devisNumero: string | null;
  factureId: string | null;
  factureNumero: string | null;
}

/** Taux de TVA suisses standards (cf. PaymentsPage). */
const TVA_OPTIONS: number[] = [8.1, 7.7, 2.6, 0];
const DEFAULT_TVA = 8.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseAmount(raw: string): number {
  const t = raw.trim().replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function amountFieldFromData(
  data: FinancialData | undefined,
  key: keyof Pick<FinancialData, "montantDevisHT" | "montantFacture" | "acomptesRecus">,
): string {
  if (!data) return "";
  const v = data[key];
  return v === undefined || v === null ? "" : String(v);
}

function normalizeTva(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_TVA;
  return TVA_OPTIONS.includes(value) ? value : DEFAULT_TVA;
}

interface ComputedFinancier {
  montantDevisHT: number;
  tvaPercent: number;
  montantTTC: number;
  montantFacture: number;
  acomptesRecus: number;
  resteAFacturer: number;
  avancementFinancierPercent: number;
}

function computeFinancier(values: FinancialFormData): ComputedFinancier {
  const montantDevisHT = parseAmount(values.montantDevisHT);
  const montantFacture = parseAmount(values.montantFacture);
  const acomptesRecus = parseAmount(values.acomptesRecus);
  const tvaPercent = normalizeTva(values.tvaPercent);

  // Si une facture est liée, son TTC est la source de vérité pour le total chantier.
  // Sinon on calcule le TTC depuis le devis HT + TVA.
  const ttcFromFacture = values.factureId ? montantFacture : 0;
  const ttcFromDevis = montantDevisHT * (1 + tvaPercent / 100);
  const montantTTC = ttcFromFacture > 0 ? ttcFromFacture : ttcFromDevis;

  const reste = montantTTC - montantFacture - acomptesRecus;
  const avancement = montantTTC > 0 ? (montantFacture / montantTTC) * 100 : 0;

  return {
    montantDevisHT,
    tvaPercent,
    montantTTC: round2(montantTTC),
    montantFacture,
    acomptesRecus,
    resteAFacturer: round2(reste),
    avancementFinancierPercent: clamp(round2(avancement), 0, 100),
  };
}

function buildLigne(values: FinancialFormData): LigneFinanciere {
  const computed = computeFinancier(values);
  const ligne: LigneFinanciere = { ...computed };
  if (values.devisId) ligne.devisId = values.devisId;
  if (values.devisNumero) ligne.devisNumero = values.devisNumero;
  if (values.factureId) ligne.factureId = values.factureId;
  if (values.factureNumero) ligne.factureNumero = values.factureNumero;
  return ligne;
}

function formDefaults(data?: FinancialData): FinancialFormData {
  return {
    montantDevisHT: amountFieldFromData(data, "montantDevisHT"),
    tvaPercent: normalizeTva(data?.tvaPercent),
    montantFacture: amountFieldFromData(data, "montantFacture"),
    acomptesRecus: amountFieldFromData(data, "acomptesRecus"),
    devisId: data?.devisId ?? null,
    devisNumero: data?.devisNumero ?? null,
    factureId: data?.factureId ?? null,
    factureNumero: data?.factureNumero ?? null,
  };
}

export function FinancialSection({ data, clientId, onSave }: FinancialSectionProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const form = useForm<FinancialFormData>({
    defaultValues: formDefaults(data),
  });

  useEffect(() => {
    form.reset(formDefaults(data));
  }, [data, form]);

  const watched = form.watch([
    "montantDevisHT",
    "tvaPercent",
    "montantFacture",
    "acomptesRecus",
    "devisId",
    "devisNumero",
    "factureId",
    "factureNumero",
  ]);

  const formValues: FinancialFormData = {
    montantDevisHT: watched[0] ?? "",
    tvaPercent: typeof watched[1] === "number" ? watched[1] : DEFAULT_TVA,
    montantFacture: watched[2] ?? "",
    acomptesRecus: watched[3] ?? "",
    devisId: (watched[4] as string | null) ?? null,
    devisNumero: (watched[5] as string | null) ?? null,
    factureId: (watched[6] as string | null) ?? null,
    factureNumero: (watched[7] as string | null) ?? null,
  };

  const computed = useMemo(() => computeFinancier(formValues), [formValues]);

  const devisHtRaw = formValues.montantDevisHT.trim();
  const hasDevisHt = devisHtRaw !== "" && parseAmount(devisHtRaw) > 0;

  const progressColor = !hasDevisHt && !formValues.factureId
    ? "bg-white/30"
    : computed.avancementFinancierPercent >= 80
      ? "bg-green-500"
      : computed.avancementFinancierPercent >= 40
        ? "bg-orange-400"
        : "bg-red-500";

  const handleSave = form.handleSubmit((values) => {
    onSave(buildLigne(values));
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset(formDefaults(data));
    setIsEditing(false);
  };

  const handleDevisChange = (details: {
    devisId: string | null;
    devisNumero: string | null;
    montantHT: number | null;
  }) => {
    form.setValue("devisId", details.devisId, { shouldDirty: true });
    form.setValue("devisNumero", details.devisNumero, { shouldDirty: true });
    if (details.montantHT !== null) {
      form.setValue("montantDevisHT", details.montantHT.toFixed(2), { shouldDirty: true });
    }
  };

  const handleFactureChange = (details: {
    factureId: string | null;
    factureNumero: string | null;
    montantTTC: number | null;
  }) => {
    form.setValue("factureId", details.factureId, { shouldDirty: true });
    form.setValue("factureNumero", details.factureNumero, { shouldDirty: true });
    if (details.montantTTC !== null) {
      form.setValue("montantFacture", details.montantTTC.toFixed(2), { shouldDirty: true });
    }
  };

  const hasAnyValue = hasDevisHt || Boolean(formValues.factureId) || computed.montantTTC > 0;

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Financier</h3>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-white/70">Devis lié</Label>
          {isEditing ? (
            <DevisAutocompleteInput
              devisId={formValues.devisId}
              devisNumero={formValues.devisNumero}
              onChange={handleDevisChange}
            />
          ) : (
            <p className="text-white/90">
              {formValues.devisNumero ? `Devis ${formValues.devisNumero}` : "—"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Montant devis HT</Label>
          {isEditing ? (
            <Input
              type="text"
              inputMode="decimal"
              {...form.register("montantDevisHT")}
              className="bg-black/20 border-white/20 text-white"
              placeholder="0.00"
            />
          ) : (
            <p className="text-white/90">{hasDevisHt ? formatCHF(computed.montantDevisHT) : "—"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">TVA</Label>
          {isEditing ? (
            <Select
              value={String(formValues.tvaPercent)}
              onValueChange={(value) =>
                form.setValue("tvaPercent", Number(value), { shouldDirty: true })
              }
            >
              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TVA_OPTIONS.map((rate) => (
                  <SelectItem key={rate} value={String(rate)}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white/90">{computed.tvaPercent}%</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Facture liée</Label>
          {isEditing ? (
            <FactureAutocompleteInput
              factureId={formValues.factureId}
              factureNumero={formValues.factureNumero}
              clientId={clientId ?? null}
              onChange={handleFactureChange}
            />
          ) : (
            <p className="text-white/90">
              {formValues.factureNumero ? `Facture ${formValues.factureNumero}` : "—"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Montant facturé à ce jour</Label>
          {isEditing ? (
            <Input
              type="text"
              inputMode="decimal"
              {...form.register("montantFacture")}
              className="bg-black/20 border-white/20 text-white"
              placeholder="0.00"
            />
          ) : (
            <p className="text-white/90">{hasAnyValue ? formatCHF(computed.montantFacture) : "—"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Acomptes reçus</Label>
          {isEditing ? (
            <Input
              type="text"
              inputMode="decimal"
              {...form.register("acomptesRecus")}
              className="bg-black/20 border-white/20 text-white"
              placeholder="0.00"
            />
          ) : (
            <p className="text-white/90">{hasAnyValue ? formatCHF(computed.acomptesRecus) : "—"}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-sm text-white/70">Montant TTC</p>
          <p className="text-white font-semibold">
            {hasAnyValue ? formatCHF(computed.montantTTC) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-sm text-white/70">Reste à facturer</p>
          <p className="text-white font-semibold">
            {hasAnyValue ? formatCHF(computed.resteAFacturer) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-sm text-white/70">Avancement financier</p>
          <p className="text-white font-semibold">
            {hasAnyValue ? `${computed.avancementFinancierPercent.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all ${progressColor}`}
            style={{
              width: hasAnyValue ? `${computed.avancementFinancierPercent}%` : "0%",
            }}
          />
        </div>
      </div>
    </section>
  );
}
