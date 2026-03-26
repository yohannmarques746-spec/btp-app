import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { CalendarClock, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChantierDetails, Jalon } from "@/types/chantierDetails";

type DatesPlanningData = Pick<
  ChantierDetails,
  "dateDebutPrevue" | "dateDebutReelle" | "dateFinPrevue" | "dateFinReelle" | "dureeJoursCalendaires" | "jalons"
>;

interface DatesPlanningSectionProps {
  data: DatesPlanningData;
  onSave: (next: DatesPlanningData) => void;
}

interface DatesPlanningFormData {
  dateDebutPrevue: string;
  dateDebutReelle: string;
  dateFinPrevue: string;
  dateFinReelle: string;
  jalons: Jalon[];
}

function toCalendarDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = end.getTime() - start.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function DatesPlanningSection({ data, onSave }: DatesPlanningSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<DatesPlanningFormData>({
    defaultValues: {
      dateDebutPrevue: data.dateDebutPrevue ?? "",
      dateDebutReelle: data.dateDebutReelle ?? "",
      dateFinPrevue: data.dateFinPrevue ?? "",
      dateFinReelle: data.dateFinReelle ?? "",
      jalons: data.jalons ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "jalons",
  });

  useEffect(() => {
    form.reset({
      dateDebutPrevue: data.dateDebutPrevue ?? "",
      dateDebutReelle: data.dateDebutReelle ?? "",
      dateFinPrevue: data.dateFinPrevue ?? "",
      dateFinReelle: data.dateFinReelle ?? "",
      jalons: data.jalons ?? [],
    });
  }, [data, form]);

  const startDate = form.watch("dateDebutReelle") || form.watch("dateDebutPrevue");
  const endDate = form.watch("dateFinReelle") || form.watch("dateFinPrevue");
  const dureeCalendaires = useMemo(() => toCalendarDays(startDate, endDate), [startDate, endDate]);

  const handleSave = form.handleSubmit((values) => {
    onSave({
      ...values,
      dureeJoursCalendaires: toCalendarDays(values.dateDebutReelle || values.dateDebutPrevue, values.dateFinReelle || values.dateFinPrevue),
      jalons: values.jalons.map((jalon) => ({
        ...jalon,
        nom: jalon.nom.trim(),
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
          <CalendarClock className="h-5 w-5 text-white/80" />
          <h3 className="text-base font-semibold text-white sm:text-lg">Dates et planning</h3>
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
          <Label className="text-white/70">Date de debut prevue</Label>
          {isEditing ? (
            <Input type="date" {...form.register("dateDebutPrevue")} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{data.dateDebutPrevue || "Non definie"}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Date de debut reelle</Label>
          {isEditing ? (
            <Input type="date" {...form.register("dateDebutReelle")} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{data.dateDebutReelle || "Non definie"}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Date de fin prevue</Label>
          {isEditing ? (
            <Input type="date" {...form.register("dateFinPrevue")} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{data.dateFinPrevue || "Non definie"}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Date de fin reelle</Label>
          {isEditing ? (
            <Input type="date" {...form.register("dateFinReelle")} className="bg-black/20 border-white/20 text-white" />
          ) : (
            <p className="text-white/90">{data.dateFinReelle || "Non definie"}</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3">
        <p className="text-sm text-white/70">Duree calculee automatiquement</p>
        <p className="text-white font-medium">{dureeCalendaires} jours (weekends inclus)</p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white/90">Jalons</h4>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10"
              onClick={() => append({ id: crypto.randomUUID(), nom: "", date: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un jalon
            </Button>
          )}
        </div>

        {fields.length === 0 && <p className="text-sm text-white/60">Aucun jalon defini</p>}

        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-black/10 p-3 md:grid-cols-[1fr_220px_auto]">
            {isEditing ? (
              <>
                <Input
                  {...form.register(`jalons.${index}.nom` as const)}
                  placeholder="Nom du jalon"
                  className="bg-black/20 border-white/20 text-white"
                />
                <Input
                  type="date"
                  {...form.register(`jalons.${index}.date` as const)}
                  className="bg-black/20 border-white/20 text-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-white/90">{field.nom || "Jalon sans nom"}</p>
                <p className="text-white/70">{field.date || "Date non definie"}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
