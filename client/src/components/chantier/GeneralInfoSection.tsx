import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ClipboardList, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChantierDetails, TypeTravaux } from "@/types/chantierDetails";

type GeneralInfoData = Pick<ChantierDetails, "clientId" | "clientNom" | "adresseChantier" | "typeTravaux" | "descriptionCourte">;

interface GeneralInfoSectionProps {
  data: GeneralInfoData;
  onSave: (next: GeneralInfoData) => void;
}

const CLIENT_OPTIONS = [
  { id: "client-001", nom: "M. Dubois Laurent" },
  { id: "client-002", nom: "Mme Rey Sophie" },
  { id: "client-003", nom: "Regie du Lac SA" },
  { id: "client-004", nom: "M. Martin Alain" },
];

const TYPE_TRAVAUX_OPTIONS: Array<{ value: TypeTravaux; label: string }> = [
  { value: "gros_oeuvre", label: "Gros oeuvre" },
  { value: "second_oeuvre", label: "Second oeuvre" },
  { value: "finitions", label: "Finitions" },
  { value: "renovation", label: "Renovation" },
  { value: "autre", label: "Autre" },
];

export function GeneralInfoSection({ data, onSave }: GeneralInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<GeneralInfoData>({
    defaultValues: {
      clientId: data.clientId ?? "",
      clientNom: data.clientNom ?? "",
      adresseChantier: data.adresseChantier ?? "",
      typeTravaux: data.typeTravaux ?? "autre",
      descriptionCourte: data.descriptionCourte ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      clientId: data.clientId ?? "",
      clientNom: data.clientNom ?? "",
      adresseChantier: data.adresseChantier ?? "",
      typeTravaux: data.typeTravaux ?? "autre",
      descriptionCourte: data.descriptionCourte ?? "",
    });
  }, [data, form]);

  const handleClientChange = (clientId: string) => {
    const selected = CLIENT_OPTIONS.find((client) => client.id === clientId);
    form.setValue("clientId", clientId);
    form.setValue("clientNom", selected?.nom ?? "");
  };

  const handleSave = form.handleSubmit((values) => {
    onSave({
      ...values,
      adresseChantier: values.adresseChantier?.trim() ?? "",
      descriptionCourte: values.descriptionCourte?.trim() ?? "",
    });
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const typeLabel = TYPE_TRAVAUX_OPTIONS.find((option) => option.value === data.typeTravaux)?.label ?? "Non defini";

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Informations generales</h3>
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
          <Label className="text-white/70">Client</Label>
          {isEditing ? (
            <Select value={form.watch("clientId") || ""} onValueChange={handleClientChange}>
              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                <SelectValue placeholder="Selectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_OPTIONS.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white/90">{data.clientNom || "Non defini"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Type de travaux</Label>
          {isEditing ? (
            <Select
              value={form.watch("typeTravaux") || "autre"}
              onValueChange={(value) => form.setValue("typeTravaux", value as TypeTravaux)}
            >
              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_TRAVAUX_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white/90">{typeLabel}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70">Adresse du chantier</Label>
          {isEditing ? (
            <Input {...form.register("adresseChantier")} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{data.adresseChantier || "Non definie"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Description courte</Label>
          {isEditing ? (
            <Textarea {...form.register("descriptionCourte")} className="min-h-[110px] bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90 whitespace-pre-wrap">{data.descriptionCourte || "Aucune description"}</p>
          )}
        </div>
      </div>
    </section>
  );
}
