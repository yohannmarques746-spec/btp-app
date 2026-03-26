import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Edit3, Plus, Save, Trash2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChantierDetails, NiveauVigilance, PointVigilance } from "@/types/chantierDetails";

type NotesData = Pick<ChantierDetails, "notesInternes" | "remarquesClient" | "pointsVigilance">;

interface NotesSectionProps {
  data: NotesData;
  onSave: (next: NotesData) => void;
}

interface NotesFormData {
  notesInternes: string;
  remarquesClient: string;
  pointsVigilance: PointVigilance[];
}

const NIVEAUX: Array<{ value: NiveauVigilance; label: string }> = [
  { value: "info", label: "Info" },
  { value: "attention", label: "Attention" },
  { value: "urgent", label: "Urgent" },
];

export function NotesSection({ data, onSave }: NotesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<NotesFormData>({
    defaultValues: {
      notesInternes: data.notesInternes ?? "",
      remarquesClient: data.remarquesClient ?? "",
      pointsVigilance: data.pointsVigilance ?? [],
    },
  });

  const pointsArray = useFieldArray({
    control: form.control,
    name: "pointsVigilance",
  });

  useEffect(() => {
    form.reset({
      notesInternes: data.notesInternes ?? "",
      remarquesClient: data.remarquesClient ?? "",
      pointsVigilance: data.pointsVigilance ?? [],
    });
  }, [data, form]);

  const handleSave = form.handleSubmit((values) => {
    onSave({
      notesInternes: values.notesInternes.trim(),
      remarquesClient: values.remarquesClient.trim(),
      pointsVigilance: values.pointsVigilance.map((point) => ({
        ...point,
        texte: point.texte.trim(),
      })),
    });
    setIsEditing(false);
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const points = form.watch("pointsVigilance");

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TriangleAlert className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Notes et observations</h3>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-white/70">Notes internes</Label>
          {isEditing ? (
            <Textarea {...form.register("notesInternes")} className="min-h-[120px] bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90 whitespace-pre-wrap">{form.watch("notesInternes") || "Aucune note"}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Remarques client</Label>
          {isEditing ? (
            <Textarea {...form.register("remarquesClient")} className="min-h-[120px] bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90 whitespace-pre-wrap">{form.watch("remarquesClient") || "Aucune remarque"}</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white/90">Points de vigilance</h4>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10"
              onClick={() => pointsArray.append({ id: crypto.randomUUID(), texte: "", niveau: "info" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {pointsArray.fields.length === 0 && <p className="text-sm text-white/60">Aucun point de vigilance</p>}
          {pointsArray.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
              {isEditing ? (
                <>
                  <Input {...form.register(`pointsVigilance.${index}.texte` as const)} placeholder="Texte du point de vigilance" className="bg-black/20 border-white/20 text-white" />
                  <Select
                    value={form.watch(`pointsVigilance.${index}.niveau`) || "info"}
                    onValueChange={(value) => form.setValue(`pointsVigilance.${index}.niveau`, value as NiveauVigilance)}
                  >
                    <SelectTrigger className="bg-black/20 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEAUX.map((niveau) => (
                        <SelectItem key={niveau.value} value={niveau.value}>
                          {niveau.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => pointsArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-white/90">{points[index]?.texte || "Sans texte"}</p>
                  <p className="text-white/70 capitalize">{points[index]?.niveau || "info"}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
