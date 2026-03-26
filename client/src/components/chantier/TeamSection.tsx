import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Edit3, Plus, Save, Trash2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChantierDetails, Fournisseur, SousTraitant } from "@/types/chantierDetails";

type TeamData = Pick<ChantierDetails, "chefChantierId" | "chefChantierNom" | "ouvriersAssignes" | "sousTraitants" | "fournisseursPrincipaux">;

interface TeamSectionProps {
  data: TeamData;
  onSave: (next: TeamData) => void;
}

interface TeamFormData {
  chefChantierId: string;
  chefChantierNom: string;
  ouvriersAssignes: string[];
  sousTraitants: SousTraitant[];
  fournisseursPrincipaux: Fournisseur[];
}

const CHEFS = [
  { id: "chef-007", nom: "Yann Marchand" },
  { id: "chef-011", nom: "Nicolas Favre" },
  { id: "chef-014", nom: "David Romanens" },
];

const OUVRIERS = [
  { id: "ouvrier-11", nom: "Lucas Moret" },
  { id: "ouvrier-18", nom: "Theo Blanc" },
  { id: "ouvrier-24", nom: "Alex Duarte" },
  { id: "ouvrier-29", nom: "Sami Khoury" },
];

export function TeamSection({ data, onSave }: TeamSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<TeamFormData>({
    defaultValues: {
      chefChantierId: data.chefChantierId ?? "",
      chefChantierNom: data.chefChantierNom ?? "",
      ouvriersAssignes: data.ouvriersAssignes ?? [],
      sousTraitants: data.sousTraitants ?? [],
      fournisseursPrincipaux: data.fournisseursPrincipaux ?? [],
    },
  });

  const sousTraitantsArray = useFieldArray({
    control: form.control,
    name: "sousTraitants",
  });
  const fournisseursArray = useFieldArray({
    control: form.control,
    name: "fournisseursPrincipaux",
  });

  useEffect(() => {
    form.reset({
      chefChantierId: data.chefChantierId ?? "",
      chefChantierNom: data.chefChantierNom ?? "",
      ouvriersAssignes: data.ouvriersAssignes ?? [],
      sousTraitants: data.sousTraitants ?? [],
      fournisseursPrincipaux: data.fournisseursPrincipaux ?? [],
    });
  }, [data, form]);

  const selectedOuvriers = form.watch("ouvriersAssignes");

  const toggleOuvrier = (id: string) => {
    const current = form.getValues("ouvriersAssignes");
    if (current.includes(id)) {
      form.setValue(
        "ouvriersAssignes",
        current.filter((item) => item !== id),
      );
      return;
    }
    form.setValue("ouvriersAssignes", [...current, id]);
  };

  const handleChefChange = (chefId: string) => {
    const selected = CHEFS.find((chef) => chef.id === chefId);
    form.setValue("chefChantierId", chefId);
    form.setValue("chefChantierNom", selected?.nom ?? "");
  };

  const handleSave = form.handleSubmit((values) => {
    onSave({
      ...values,
      sousTraitants: values.sousTraitants.map((item) => ({
        ...item,
        nom: item.nom.trim(),
        metier: item.metier.trim(),
        tel: item.tel.trim(),
      })),
      fournisseursPrincipaux: values.fournisseursPrincipaux.map((item) => ({
        ...item,
        nom: item.nom.trim(),
        contact: item.contact.trim(),
      })),
    });
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
          <Users className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Equipe et intervenants</h3>
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
          <Label className="text-white/70">Chef de chantier</Label>
          {isEditing ? (
            <Select value={form.watch("chefChantierId")} onValueChange={handleChefChange}>
              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                <SelectValue placeholder="Selectionner un responsable" />
              </SelectTrigger>
              <SelectContent>
                {CHEFS.map((chef) => (
                  <SelectItem key={chef.id} value={chef.id}>
                    {chef.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white/90">{data.chefChantierNom || "Non defini"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Ouvriers assignes</Label>
          {isEditing ? (
            <div className="grid grid-cols-1 gap-2">
              {OUVRIERS.map((ouvrier) => (
                <button
                  type="button"
                  key={ouvrier.id}
                  onClick={() => toggleOuvrier(ouvrier.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedOuvriers.includes(ouvrier.id)
                      ? "border-blue-300/50 bg-blue-500/20 text-white"
                      : "border-white/15 bg-black/20 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {ouvrier.nom}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedOuvriers.length === 0 ? (
                <p className="text-white/60">Aucun ouvrier assigne</p>
              ) : (
                selectedOuvriers.map((id) => (
                  <Badge key={id} className="bg-white/10 border border-white/20 text-white/90">
                    {OUVRIERS.find((ouvrier) => ouvrier.id === id)?.nom || id}
                  </Badge>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white/90">Sous-traitants</h4>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                className="text-white border-white/20 hover:bg-white/10"
                onClick={() => sousTraitantsArray.append({ id: crypto.randomUUID(), nom: "", metier: "", tel: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {sousTraitantsArray.fields.length === 0 && <p className="text-sm text-white/60">Aucun sous-traitant</p>}
            {sousTraitantsArray.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_180px_auto]">
                {isEditing ? (
                  <>
                    <Input {...form.register(`sousTraitants.${index}.nom` as const)} placeholder="Nom" className="bg-black/20 border-white/20 text-white" />
                    <Input {...form.register(`sousTraitants.${index}.metier` as const)} placeholder="Metier" className="bg-black/20 border-white/20 text-white" />
                    <Input {...form.register(`sousTraitants.${index}.tel` as const)} placeholder="Telephone" className="bg-black/20 border-white/20 text-white" />
                    <Button type="button" size="icon" variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => sousTraitantsArray.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-white/90">{field.nom}</p>
                    <p className="text-white/70">{field.metier}</p>
                    <p className="text-white/70">{field.tel}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white/90">Fournisseurs principaux</h4>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                className="text-white border-white/20 hover:bg-white/10"
                onClick={() => fournisseursArray.append({ id: crypto.randomUUID(), nom: "", contact: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {fournisseursArray.fields.length === 0 && <p className="text-sm text-white/60">Aucun fournisseur</p>}
            {fournisseursArray.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                {isEditing ? (
                  <>
                    <Input {...form.register(`fournisseursPrincipaux.${index}.nom` as const)} placeholder="Nom" className="bg-black/20 border-white/20 text-white" />
                    <Input {...form.register(`fournisseursPrincipaux.${index}.contact` as const)} placeholder="Contact" className="bg-black/20 border-white/20 text-white" />
                    <Button type="button" size="icon" variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => fournisseursArray.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-white/90">{field.nom}</p>
                    <p className="text-white/70">{field.contact}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
