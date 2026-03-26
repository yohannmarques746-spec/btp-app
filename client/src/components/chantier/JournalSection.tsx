import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Edit3, NotebookPen, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChantierDetails, JournalEntry, MeteoCondition } from "@/types/chantierDetails";

type JournalData = Pick<ChantierDetails, "journalEntries" | "incidentsProblemes">;

interface JournalSectionProps {
  data: JournalData;
  onSave: (next: JournalData) => void;
}

interface JournalFormData {
  journalEntries: JournalEntry[];
  incidentsProblemes: string;
}

const METEO_OPTIONS: Array<{ value: MeteoCondition; label: string }> = [
  { value: "beau", label: "Beau" },
  { value: "nuageux", label: "Nuageux" },
  { value: "pluie", label: "Pluie" },
  { value: "neige", label: "Neige" },
  { value: "vent_fort", label: "Vent fort" },
];

export function JournalSection({ data, onSave }: JournalSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expandedEntryIndex, setExpandedEntryIndex] = useState<number | null>(null);
  const form = useForm<JournalFormData>({
    defaultValues: {
      journalEntries: data.journalEntries ?? [],
      incidentsProblemes: data.incidentsProblemes ?? "",
    },
  });

  const journalArray = useFieldArray({
    control: form.control,
    name: "journalEntries",
  });

  useEffect(() => {
    form.reset({
      journalEntries: data.journalEntries ?? [],
      incidentsProblemes: data.incidentsProblemes ?? "",
    });
  }, [data, form]);

  const entries = form.watch("journalEntries");
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries],
  );

  const handleSave = form.handleSubmit((values) => {
    onSave({
      journalEntries: values.journalEntries.map((entry) => ({
        ...entry,
        texte: entry.texte.trim(),
        auteur: entry.auteur.trim(),
      })),
      incidentsProblemes: values.incidentsProblemes.trim(),
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
          <NotebookPen className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Suivi / Journal de chantier</h3>
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

      {isEditing && (
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10"
            onClick={() =>
              journalArray.prepend({
                id: crypto.randomUUID(),
                date: new Date().toISOString().slice(0, 10),
                texte: "",
                auteur: "",
                meteo: "beau",
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une entree
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {sortedEntries.length === 0 && <p className="text-sm text-white/60">Aucune entree de journal</p>}
        {sortedEntries.map((entry) => {
          const realIndex = entries.findIndex((item) => item.id === entry.id);
          if (realIndex < 0) return null;
          return (
            <div key={entry.id} className="rounded-lg border border-white/10 bg-black/10 p-3">
              {isEditing ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_160px_1fr_130px_auto]">
                  <Input type="date" {...form.register(`journalEntries.${realIndex}.date` as const)} className="bg-black/20 border-white/20 text-white" />
                  <Input {...form.register(`journalEntries.${realIndex}.auteur` as const)} placeholder="Auteur" className="bg-black/20 border-white/20 text-white" />
                  <Button
                    type="button"
                    variant="outline"
                    className="text-white border-white/20 hover:bg-white/10 justify-start"
                    onClick={() => setExpandedEntryIndex(realIndex)}
                  >
                    {form.watch(`journalEntries.${realIndex}.texte`) ? "Modifier le texte" : "Saisir le texte"}
                  </Button>
                  <Select
                    value={form.watch(`journalEntries.${realIndex}.meteo`) || "beau"}
                    onValueChange={(value) => form.setValue(`journalEntries.${realIndex}.meteo`, value as MeteoCondition)}
                  >
                    <SelectTrigger className="bg-black/20 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METEO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => journalArray.remove(realIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-white/60">{entry.date} - {entry.auteur}</p>
                  <p className="text-white/90">{entry.texte}</p>
                  <p className="text-sm text-white/70">Meteo: {entry.meteo || "non renseignee"}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <Label className="text-white/70">Incidents / problemes</Label>
        {isEditing ? (
          <Textarea {...form.register("incidentsProblemes")} className="min-h-[100px] bg-black/20 border-white/20 text-white" />
        ) : (
          <p className="text-white/90 whitespace-pre-wrap">{form.watch("incidentsProblemes") || "Aucun incident signale"}</p>
        )}
      </div>

      <Dialog open={expandedEntryIndex !== null} onOpenChange={(open) => !open && setExpandedEntryIndex(null)}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Texte du rapport chantier</DialogTitle>
          </DialogHeader>
          {expandedEntryIndex !== null && (
            <div className="space-y-3">
              <Textarea
                value={form.watch(`journalEntries.${expandedEntryIndex}.texte`) || ""}
                onChange={(e) => form.setValue(`journalEntries.${expandedEntryIndex}.texte`, e.target.value)}
                className="min-h-[220px] bg-black/20 border-white/20 text-white"
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => setExpandedEntryIndex(null)} className="bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
