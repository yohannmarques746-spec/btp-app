import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Edit3, Package, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChantierDetails, Materiau, StatutLivraison } from "@/types/chantierDetails";

type MaterialsData = Pick<ChantierDetails, "materiaux">;

interface MaterialsSectionProps {
  data: MaterialsData;
  onSave: (next: MaterialsData) => void;
}

interface MaterialsFormData {
  materiaux: Materiau[];
}

const STATUTS: Array<{ value: StatutLivraison; label: string }> = [
  { value: "en_attente", label: "En attente" },
  { value: "commande", label: "Commande" },
  { value: "livre", label: "Livre" },
];

export function MaterialsSection({ data, onSave }: MaterialsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<MaterialsFormData>({
    defaultValues: {
      materiaux: data.materiaux ?? [],
    },
  });

  const materiauxArray = useFieldArray({
    control: form.control,
    name: "materiaux",
  });

  useEffect(() => {
    form.reset({
      materiaux: data.materiaux ?? [],
    });
  }, [data, form]);

  const handleSave = form.handleSubmit((values) => {
    onSave({
      materiaux: values.materiaux.map((item) => ({
        ...item,
        nom: item.nom.trim(),
        fournisseur: item.fournisseur.trim(),
        qtePrevue: Number(item.qtePrevue) || 0,
        qteCommandee: Number(item.qteCommandee) || 0,
        qteLivree: Number(item.qteLivree) || 0,
      })),
    });
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const rows = form.watch("materiaux");

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Materiaux et approvisionnement</h3>
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

      <div className="mb-3 flex items-center justify-between">
        <Label className="text-white/70">Tableau des materiaux</Label>
        {isEditing && (
          <Button
            type="button"
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10"
            onClick={() =>
              materiauxArray.append({
                id: crypto.randomUUID(),
                nom: "",
                qtePrevue: 0,
                qteCommandee: 0,
                qteLivree: 0,
                fournisseur: "",
                statut: "en_attente",
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une ligne
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {materiauxArray.fields.length === 0 && <p className="text-sm text-white/60">Aucun materiau renseigne</p>}
        <div className="hidden lg:grid lg:grid-cols-[1.2fr_120px_120px_120px_1fr_160px_auto] gap-2 px-1 text-xs text-white/60">
          <p>Designation</p>
          <p>Qte prevue</p>
          <p>Qte commandee</p>
          <p>Qte livree</p>
          <p>Fournisseur</p>
          <p>Statut</p>
          <p>Actions</p>
        </div>
        {materiauxArray.fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-white/10 bg-black/10 p-3">
            {isEditing ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.2fr_120px_120px_120px_1fr_160px_auto]">
                <Input {...form.register(`materiaux.${index}.nom` as const)} placeholder="Materiau" className="bg-black/20 border-white/20 text-white" />
                <Input type="number" {...form.register(`materiaux.${index}.qtePrevue` as const, { valueAsNumber: true })} placeholder="Qté prevue" className="bg-black/20 border-white/20 text-white" />
                <Input type="number" {...form.register(`materiaux.${index}.qteCommandee` as const, { valueAsNumber: true })} placeholder="Qté commandee" className="bg-black/20 border-white/20 text-white" />
                <Input type="number" {...form.register(`materiaux.${index}.qteLivree` as const, { valueAsNumber: true })} placeholder="Qté livree" className="bg-black/20 border-white/20 text-white" />
                <Input {...form.register(`materiaux.${index}.fournisseur` as const)} placeholder="Fournisseur" className="bg-black/20 border-white/20 text-white" />
                <Select
                  value={form.watch(`materiaux.${index}.statut`) || "en_attente"}
                  onValueChange={(value) => form.setValue(`materiaux.${index}.statut`, value as StatutLivraison)}
                >
                  <SelectTrigger className="bg-black/20 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map((statut) => (
                      <SelectItem key={statut.value} value={statut.value}>
                        {statut.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => materiauxArray.remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm text-white/85 md:grid-cols-4 lg:grid-cols-7">
                <p>{rows[index]?.nom}</p>
                <p>Prevue: {rows[index]?.qtePrevue}</p>
                <p>Commandee: {rows[index]?.qteCommandee}</p>
                <p>Livree: {rows[index]?.qteLivree}</p>
                <p>{rows[index]?.fournisseur}</p>
                <p>{STATUTS.find((s) => s.value === rows[index]?.statut)?.label || "En attente"}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
