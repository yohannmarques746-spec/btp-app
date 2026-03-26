import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Edit3, Save, Trash2, X } from "lucide-react";
import type { ChantierHeader, ChantierStatut } from "@/types/chantierDetails";

interface FicheHeaderSectionProps {
  chantier: ChantierHeader;
  onSave: (next: ChantierHeader) => void;
  onArchive: () => void;
  onDelete: () => void;
}

const statusMeta: Record<ChantierStatut, { label: string; classes: string }> = {
  en_attente: { label: "En attente", classes: "bg-gray-500/20 text-gray-300 border border-gray-400/30" },
  en_cours: { label: "En cours", classes: "bg-blue-500/20 text-blue-300 border border-blue-400/30" },
  termine: { label: "Termine", classes: "bg-green-500/20 text-green-300 border border-green-400/30" },
  arrete: { label: "Arrete", classes: "bg-red-500/20 text-red-300 border border-red-400/30" },
};

export function FicheHeaderSection({ chantier, onSave, onArchive, onDelete }: FicheHeaderSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<ChantierHeader>({
    defaultValues: chantier,
  });

  useEffect(() => {
    form.reset(chantier);
  }, [chantier, form]);

  const watchedStatus = form.watch("statut");
  const currentMeta = useMemo(() => statusMeta[watchedStatus || chantier.statut], [chantier.statut, watchedStatus]);

  const handleSave = form.handleSubmit((values) => {
    onSave({
      ...chantier,
      ...values,
      nom: values.nom.trim(),
      reference: values.reference.trim(),
    });
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset(chantier);
    setIsEditing(false);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <Label className="text-white/60">Nom du chantier</Label>
            {isEditing ? (
              <Input
                {...form.register("nom", { required: true })}
                className="h-11 bg-black/20 border-white/20 text-xl font-semibold text-white"
              />
            ) : (
              <h2 className="truncate text-2xl font-bold text-white sm:text-3xl">{chantier.nom}</h2>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-white/60">Statut</Label>
              {isEditing ? (
                <Select
                  value={form.watch("statut")}
                  onValueChange={(value) => form.setValue("statut", value as ChantierStatut)}
                >
                  <SelectTrigger className="bg-black/20 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Termine</SelectItem>
                    <SelectItem value="arrete">Arrete</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={currentMeta.classes}>{statusMeta[chantier.statut].label}</Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Reference interne</Label>
              {isEditing ? (
                <Input {...form.register("reference", { required: true })} className="bg-black/20 border-white/20 text-white" />
              ) : (
                <p className="font-mono text-white/90">{chantier.reference}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:justify-end">
          {!isEditing ? (
            <Button type="button" onClick={() => setIsEditing(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/20">
              <Edit3 className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          ) : (
            <>
              <Button type="button" onClick={handleSave} className="bg-white/20 hover:bg-white/30 text-white border border-white/20">
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="text-white border-white/20 hover:bg-white/10">
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
        <Button type="button" variant="ghost" onClick={onArchive} className="text-white/70 hover:text-white hover:bg-white/10">
          <Archive className="mr-2 h-4 w-4" />
          Archiver
        </Button>
        <Button type="button" variant="ghost" onClick={onDelete} className="text-red-300 hover:text-red-200 hover:bg-red-500/10">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </Button>
      </div>
    </section>
  );
}

