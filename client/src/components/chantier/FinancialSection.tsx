import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DollarSign, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChantierDetails, LigneFinanciere } from "@/types/chantierDetails";

type FinancialData = NonNullable<ChantierDetails["financier"]>;

interface FinancialSectionProps {
  data?: FinancialData;
  onSave: (next: FinancialData) => void;
}

interface FinancialFormData {
  montantDevisHT: number;
  tvaPercent: number;
  montantFacture: number;
  acomptesRecus: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildFinancial(values: FinancialFormData): LigneFinanciere {
  const ttc = values.montantDevisHT * (1 + values.tvaPercent / 100);
  const reste = ttc - values.montantFacture - values.acomptesRecus;
  const avancement = ttc > 0 ? (values.montantFacture / ttc) * 100 : 0;
  return {
    montantDevisHT: values.montantDevisHT,
    tvaPercent: values.tvaPercent,
    montantTTC: round1(ttc),
    montantFacture: values.montantFacture,
    acomptesRecus: values.acomptesRecus,
    resteAFacturer: round1(reste),
    avancementFinancierPercent: clamp(round1(avancement), 0, 100),
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function FinancialSection({ data, onSave }: FinancialSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<FinancialFormData>({
    defaultValues: {
      montantDevisHT: data?.montantDevisHT ?? 0,
      tvaPercent: data?.tvaPercent ?? 8,
      montantFacture: data?.montantFacture ?? 0,
      acomptesRecus: data?.acomptesRecus ?? 0,
    },
  });

  useEffect(() => {
    form.reset({
      montantDevisHT: data?.montantDevisHT ?? 0,
      tvaPercent: data?.tvaPercent ?? 8,
      montantFacture: data?.montantFacture ?? 0,
      acomptesRecus: data?.acomptesRecus ?? 0,
    });
  }, [data, form]);

  const watched = form.watch(["montantDevisHT", "tvaPercent", "montantFacture", "acomptesRecus"]);

  const computed = useMemo(
    () =>
      buildFinancial({
        montantDevisHT: toNumber(watched[0]),
        tvaPercent: toNumber(watched[1]),
        montantFacture: toNumber(watched[2]),
        acomptesRecus: toNumber(watched[3]),
      }),
    [watched],
  );

  const progressColor =
    computed.avancementFinancierPercent >= 80
      ? "bg-green-500"
      : computed.avancementFinancierPercent >= 40
        ? "bg-orange-400"
        : "bg-red-500";

  const handleSave = form.handleSubmit((values) => {
    onSave(buildFinancial(values));
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Financier</h3>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-white/70">Montant devis HT</Label>
          {isEditing ? (
            <Input type="number" step="0.1" {...form.register("montantDevisHT", { valueAsNumber: true })} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{computed.montantDevisHT.toLocaleString("fr-CH")} CHF</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">TVA %</Label>
          {isEditing ? (
            <Select value={String(form.watch("tvaPercent"))} onValueChange={(value) => form.setValue("tvaPercent", Number(value))}>
              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8%</SelectItem>
                <SelectItem value="7.7">7.7%</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white/90">{computed.tvaPercent}%</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Montant facture a ce jour</Label>
          {isEditing ? (
            <Input type="number" step="0.1" {...form.register("montantFacture", { valueAsNumber: true })} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{computed.montantFacture.toLocaleString("fr-CH")} CHF</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Acomptes recus</Label>
          {isEditing ? (
            <Input type="number" step="0.1" {...form.register("acomptesRecus", { valueAsNumber: true })} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{computed.acomptesRecus.toLocaleString("fr-CH")} CHF</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-sm text-white/70">Montant TTC</p>
          <p className="text-white font-semibold">{computed.montantTTC.toLocaleString("fr-CH")} CHF</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-sm text-white/70">Reste a facturer</p>
          <p className="text-white font-semibold">{computed.resteAFacturer.toLocaleString("fr-CH")} CHF</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-sm text-white/70">Avancement financier</p>
          <p className="text-white font-semibold">{computed.avancementFinancierPercent.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all ${progressColor}`}
            style={{ width: `${computed.avancementFinancierPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
