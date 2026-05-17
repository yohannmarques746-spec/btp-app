import { useEffect, useRef, useState, type RefObject } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TVA_OPTIONS } from "@/types/devis";
import { calculateLigneTotalHT } from "@/utils/devisCalculs";
import { formatCHF } from "@/utils/chf";
import { UnitePrestationSelect } from "./UnitePrestationSelect";
import type { LignePrestationDraft, LignePrestationFocusField } from "./types";

export interface LignePrestationEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ligneIndex: number;
  initialDraft: LignePrestationDraft;
  initialFocus: LignePrestationFocusField;
  onApply: (draft: LignePrestationDraft) => void;
}

function truncateDescription(text: string, max = 40): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function parseDecimalInput(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "" || normalized === ".") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberToInputString(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

/** Min. 0,01 à la validation ; champ vide → 1 (défaut ligne neuve). */
function resolveQuantiteFromText(text: string, fallback: number): number {
  const parsed = parseDecimalInput(text);
  if (parsed === null) return fallback > 0 ? fallback : 1;
  return Math.max(0.01, Math.round(parsed * 100) / 100);
}

function resolvePrixFromText(text: string): number {
  const parsed = parseDecimalInput(text);
  if (parsed === null) return 0;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

export function LignePrestationEditorDialog({
  open,
  onOpenChange,
  ligneIndex,
  initialDraft,
  initialFocus,
  onApply,
}: LignePrestationEditorDialogProps) {
  const [draft, setDraft] = useState<LignePrestationDraft>(initialDraft);
  const [quantiteText, setQuantiteText] = useState(() => numberToInputString(initialDraft.quantite));
  const [prixText, setPrixText] = useState(() => numberToInputString(initialDraft.prixUnitaireHT));

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const quantiteRef = useRef<HTMLInputElement>(null);
  const prixRef = useRef<HTMLInputElement>(null);

  const refs: Record<LignePrestationFocusField, RefObject<HTMLElement | null>> = {
    description: descriptionRef,
    quantite: quantiteRef,
    unite: { current: null },
    prixUnitaireHT: prixRef,
    tauxTVA: { current: null },
  };

  useEffect(() => {
    if (open) {
      setDraft(initialDraft);
      setQuantiteText(numberToInputString(initialDraft.quantite));
      setPrixText(numberToInputString(initialDraft.prixUnitaireHT));
    }
  }, [open, initialDraft]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (initialFocus === "unite" || initialFocus === "tauxTVA") return;
      refs[initialFocus]?.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open, initialFocus]);

  const quantitePreview =
    parseDecimalInput(quantiteText) ?? (quantiteText.trim() === "" ? 0 : draft.quantite);
  const prixPreview = parseDecimalInput(prixText) ?? (prixText.trim() === "" ? 0 : draft.prixUnitaireHT);
  const totalHT = calculateLigneTotalHT({
    quantite: quantitePreview,
    prixUnitaireHT: prixPreview,
  });

  const titleSuffix = truncateDescription(draft.description);
  const dialogTitle = titleSuffix
    ? `Ligne ${ligneIndex + 1} — ${titleSuffix}`
    : `Ligne ${ligneIndex + 1}`;

  function patchDraft(partial: Partial<LignePrestationDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function adjustQuantite(delta: number) {
    const base = parseDecimalInput(quantiteText) ?? draft.quantite;
    const next = Math.max(0.01, Math.round((base + delta) * 100) / 100);
    setQuantiteText(numberToInputString(next));
    setDraft((prev) => ({ ...prev, quantite: next }));
  }

  function commitQuantiteText() {
    if (quantiteText.trim() === "") return;
    const next = resolveQuantiteFromText(quantiteText, draft.quantite);
    setQuantiteText(numberToInputString(next));
    setDraft((prev) => ({ ...prev, quantite: next }));
  }

  function commitPrixText() {
    const next = resolvePrixFromText(prixText);
    setPrixText(numberToInputString(next));
    setDraft((prev) => ({ ...prev, prixUnitaireHT: next }));
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleApply() {
    const quantite = resolveQuantiteFromText(quantiteText, draft.quantite);
    const prixUnitaireHT = resolvePrixFromText(prixText);
    onApply({ ...draft, quantite, prixUnitaireHT });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left text-white">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="ligne-description">Description</Label>
            <Textarea
              id="ligne-description"
              ref={descriptionRef}
              rows={3}
              value={draft.description}
              onChange={(e) => patchDraft({ description: e.target.value })}
              placeholder="Ex. : Peinture murs salon"
              className="bg-black/20 border-white/10 text-white text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ligne-quantite">Quantité</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-white/10 bg-black/20"
                onClick={() => adjustQuantite(-1)}
                aria-label="Diminuer de 1"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-white/10 bg-black/20 text-xs"
                onClick={() => adjustQuantite(-0.01)}
                aria-label="Diminuer de 0.01"
              >
                −0.01
              </Button>
              <Input
                id="ligne-quantite"
                ref={quantiteRef}
                type="text"
                inputMode="decimal"
                value={quantiteText}
                onChange={(e) => setQuantiteText(e.target.value)}
                onBlur={commitQuantiteText}
                placeholder="1"
                className="bg-black/20 border-white/10 text-center text-lg text-white"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-white/10 bg-black/20 text-xs"
                onClick={() => adjustQuantite(0.01)}
                aria-label="Augmenter de 0.01"
              >
                +0.01
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-white/10 bg-black/20"
                onClick={() => adjustQuantite(1)}
                aria-label="Augmenter de 1"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unité</Label>
            <UnitePrestationSelect
              value={draft.unite}
              onChange={(unite) => patchDraft({ unite })}
              className="h-10 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ligne-prix">Prix unitaire HT (CHF)</Label>
            <Input
              id="ligne-prix"
              ref={prixRef}
              type="text"
              inputMode="decimal"
              value={prixText}
              onChange={(e) => setPrixText(e.target.value)}
              onBlur={commitPrixText}
              placeholder="0.00"
              className="bg-black/20 border-white/10 text-lg text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>TVA</Label>
            <Select
              value={String(draft.tauxTVA)}
              onValueChange={(v) => patchDraft({ tauxTVA: Number.parseFloat(v) })}
            >
              <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TVA_OPTIONS.map((t) => (
                  <SelectItem key={String(t)} value={String(t)}>
                    {t}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm">
            <div className="flex justify-between text-white/70">
              <span>Total ligne HT</span>
              <span className="font-semibold text-white text-base">{formatCHF(totalHT)}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {quantitePreview || "—"} × {formatCHF(prixPreview)} (hors TVA ligne)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCancel} className="border-white/10">
            Annuler
          </Button>
          <Button type="button" onClick={handleApply}>
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
