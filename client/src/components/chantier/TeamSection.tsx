import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Edit3, Plus, Save, Trash2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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

const MANUAL_CHEF_VALUE = "__manual__";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function TeamSection({ data, onSave }: TeamSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [manualOuvrierInput, setManualOuvrierInput] = useState("");
  const [manualChefInput, setManualChefInput] = useState("");
  const { members, loading: membersLoading } = useTeamMembers();

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
  const chefChantierId = form.watch("chefChantierId");
  const chefChantierNom = form.watch("chefChantierNom");

  // Nom -> rôle de l'éventuel membre d'équipe correspondant, pour l'affichage.
  const memberRoleByName = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const m of members) map.set(normalizeName(m.name), m.role ?? null);
    return map;
  }, [members]);

  const chefSelectValue = useMemo(() => {
    if (chefChantierId && chefChantierId.startsWith("member:")) return chefChantierId;
    if (chefChantierNom) return MANUAL_CHEF_VALUE;
    return "";
  }, [chefChantierId, chefChantierNom]);

  const handleChefChange = (value: string) => {
    if (value === MANUAL_CHEF_VALUE) {
      // Bascule en saisie manuelle ; on garde le nom déjà saisi s'il existe.
      form.setValue("chefChantierId", "");
      return;
    }
    const member = members.find((m) => `member:${m.id}` === value);
    if (!member) return;
    form.setValue("chefChantierId", `member:${member.id}`);
    form.setValue("chefChantierNom", member.name);
    setManualChefInput("");
  };

  const handleManualChefBlur = () => {
    const name = normalizeName(manualChefInput);
    if (!name) return;
    form.setValue("chefChantierId", "");
    form.setValue("chefChantierNom", name);
  };

  const toggleOuvrier = (name: string) => {
    const normalized = normalizeName(name);
    if (!normalized) return;
    const current = form.getValues("ouvriersAssignes");
    if (current.includes(normalized)) {
      form.setValue(
        "ouvriersAssignes",
        current.filter((item) => item !== normalized),
      );
      return;
    }
    form.setValue("ouvriersAssignes", [...current, normalized]);
  };

  const removeOuvrier = (name: string) => {
    const current = form.getValues("ouvriersAssignes");
    form.setValue("ouvriersAssignes", current.filter((item) => item !== name));
  };

  const addManualOuvrier = () => {
    const name = normalizeName(manualOuvrierInput);
    if (!name) return;
    const current = form.getValues("ouvriersAssignes");
    if (!current.includes(name)) {
      form.setValue("ouvriersAssignes", [...current, name]);
    }
    setManualOuvrierInput("");
  };

  const handleSave = form.handleSubmit((values) => {
    const cleanedOuvriers = Array.from(
      new Set(
        values.ouvriersAssignes
          .map((name) => normalizeName(name))
          .filter((name) => name.length > 0),
      ),
    );
    onSave({
      chefChantierId: values.chefChantierId || undefined,
      chefChantierNom: normalizeName(values.chefChantierNom),
      ouvriersAssignes: cleanedOuvriers,
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
    setManualOuvrierInput("");
    setManualChefInput("");
    setIsEditing(false);
  };

  const manualChefMode = chefSelectValue === MANUAL_CHEF_VALUE;
  const teamMemberNames = new Set(members.map((m) => normalizeName(m.name)));
  const manualOuvriers = selectedOuvriers.filter((name) => !teamMemberNames.has(name));

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
            <div className="space-y-2">
              <Select value={chefSelectValue} onValueChange={handleChefChange}>
                <SelectTrigger className="bg-black/20 border-white/20 text-white">
                  <SelectValue placeholder={membersLoading ? "Chargement de l'equipe..." : "Selectionner un responsable"} />
                </SelectTrigger>
                <SelectContent>
                  {members.length === 0 && !membersLoading && (
                    <SelectItem disabled value="__none__">
                      Aucun membre d'equipe actif
                    </SelectItem>
                  )}
                  {members.map((member) => (
                    <SelectItem key={member.id} value={`member:${member.id}`}>
                      {member.name}
                      {member.role ? ` · ${member.role}` : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_CHEF_VALUE}>+ Saisir manuellement…</SelectItem>
                </SelectContent>
              </Select>
              {manualChefMode && (
                <Input
                  placeholder="Nom du chef de chantier"
                  value={manualChefInput || chefChantierNom}
                  onChange={(e) => {
                    setManualChefInput(e.target.value);
                    form.setValue("chefChantierNom", e.target.value);
                  }}
                  onBlur={handleManualChefBlur}
                  className="bg-black/20 border-white/20 text-white"
                />
              )}
            </div>
          ) : (
            <p className="text-white/90">{data.chefChantierNom || "Non defini"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">Ouvriers assignes</Label>
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {membersLoading && <p className="text-sm text-white/60">Chargement de l'equipe…</p>}
                {!membersLoading && members.length === 0 && (
                  <p className="text-sm text-white/60">
                    Aucun membre d'equipe actif. Ajoutez des ouvriers manuellement ci-dessous.
                  </p>
                )}
                {members.map((member) => {
                  const name = normalizeName(member.name);
                  const selected = selectedOuvriers.includes(name);
                  return (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => toggleOuvrier(name)}
                      className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-blue-300/50 bg-blue-500/20 text-white"
                          : "border-white/15 bg-black/20 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span>{member.name}</span>
                      {member.role && <span className="ml-2 text-xs text-white/50">{member.role}</span>}
                    </button>
                  );
                })}
              </div>

              {manualOuvriers.length > 0 && (
                <div className="space-y-2 rounded-md border border-white/10 bg-black/10 p-2">
                  <p className="text-xs text-white/60">Ouvriers ajoutes manuellement</p>
                  <div className="flex flex-wrap gap-2">
                    {manualOuvriers.map((name) => (
                      <Badge key={name} className="flex items-center gap-1 bg-white/10 border border-white/20 text-white/90">
                        {name}
                        <button
                          type="button"
                          onClick={() => removeOuvrier(name)}
                          className="rounded-sm p-0.5 hover:bg-white/10"
                          aria-label={`Retirer ${name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={manualOuvrierInput}
                  onChange={(e) => setManualOuvrierInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addManualOuvrier();
                    }
                  }}
                  placeholder="Ajouter un ouvrier (saisie libre)…"
                  className="bg-black/20 border-white/20 text-white"
                />
                <Button
                  type="button"
                  onClick={addManualOuvrier}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedOuvriers.length === 0 ? (
                <p className="text-white/60">Aucun ouvrier assigne</p>
              ) : (
                selectedOuvriers.map((name) => {
                  const role = memberRoleByName.get(name);
                  return (
                    <Badge key={name} className="bg-white/10 border border-white/20 text-white/90">
                      {name}
                      {role ? ` · ${role}` : ""}
                    </Badge>
                  );
                })
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
