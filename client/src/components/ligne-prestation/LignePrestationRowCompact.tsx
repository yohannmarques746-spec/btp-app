import { Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UNITE_OPTION_GROUPS } from "@/constants/unitesPrestation";
import { formatCHF } from "@/utils/chf";
import { cn } from "@/lib/utils";
import { formatQuantiteDisplay, type LignePrestationDraft, type LignePrestationFocusField } from "./types";

export interface LignePrestationRowCompactProps {
  ligneIndex: number;
  draft: LignePrestationDraft;
  totalHT: number;
  onOpenEditor: (focus: LignePrestationFocusField) => void;
  onRemove?: () => void;
  canRemove: boolean;
  layout?: "grid" | "stacked";
}

const cellButtonClass =
  "flex h-9 w-full items-center rounded-md border border-white/10 bg-black/20 px-3 text-sm text-left text-white truncate hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function uniteDisplayLabel(code: string): string {
  for (const group of UNITE_OPTION_GROUPS) {
    const found = group.options.find((o) => o.code === code);
    if (found) return `${found.code} — ${found.libelle}`;
  }
  return code || "—";
}

function CompactCell({
  label,
  value,
  title,
  onClick,
  className,
}: {
  label: string;
  value: string;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-white/70 text-xs md:sr-only">{label}</Label>
      <button type="button" className={cellButtonClass} title={title} onClick={onClick} aria-label={`${label} : ${title}`}>
        {value || "—"}
      </button>
    </div>
  );
}

function GridRow({
  ligneIndex,
  draft,
  totalHT,
  onOpenEditor,
  onRemove,
  canRemove,
}: Omit<LignePrestationRowCompactProps, "layout">) {
  const descriptionDisplay = draft.description.trim() || "Prestation (description)";
  const prixDisplay =
    draft.prixUnitaireHT > 0 ? formatCHF(draft.prixUnitaireHT) : draft.prixUnitaireHT.toFixed(2);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-12 md:items-end">
      <CompactCell
        label="Prestation (description)"
        value={descriptionDisplay}
        title={draft.description || "Ajouter une description"}
        onClick={() => onOpenEditor("description")}
        className="md:col-span-3"
      />
      <CompactCell
        label="Quantité"
        value={formatQuantiteDisplay(draft.quantite)}
        title={formatQuantiteDisplay(draft.quantite)}
        onClick={() => onOpenEditor("quantite")}
        className="md:col-span-2 min-w-[4.5rem]"
      />
      <CompactCell
        label="Unité"
        value={draft.unite}
        title={uniteDisplayLabel(draft.unite)}
        onClick={() => onOpenEditor("unite")}
        className="md:col-span-2"
      />
      <CompactCell
        label="Prix unitaire HT"
        value={prixDisplay}
        title={prixDisplay}
        onClick={() => onOpenEditor("prixUnitaireHT")}
        className="md:col-span-2 min-w-[4.5rem]"
      />
      <CompactCell
        label="TVA"
        value={`${draft.tauxTVA}%`}
        title={`TVA ${draft.tauxTVA}%`}
        onClick={() => onOpenEditor("tauxTVA")}
        className="md:col-span-1 min-w-[4.5rem]"
      />
      <div className="md:col-span-1 space-y-1 min-w-[4.5rem]">
        <Label className="text-white/70 text-xs md:sr-only">Total ligne HT</Label>
        <button
          type="button"
          className={cn(cellButtonClass, "bg-black/30")}
          title={formatCHF(totalHT)}
          onClick={() => onOpenEditor("prixUnitaireHT")}
          aria-label={`Total ligne HT : ${formatCHF(totalHT)}`}
        >
          {formatCHF(totalHT)}
        </button>
      </div>
      <div className="flex gap-1 md:col-span-1 md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-white/10 bg-black/20 shrink-0"
          onClick={() => onOpenEditor("description")}
          aria-label={`Modifier la ligne ${ligneIndex + 1}`}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Supprimer la ligne"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StackedRow({
  ligneIndex,
  draft,
  totalHT,
  onOpenEditor,
  onRemove,
  canRemove,
}: Omit<LignePrestationRowCompactProps, "layout">) {
  const descriptionDisplay = draft.description.trim() || "Description de la prestation";
  const prixDisplay =
    draft.prixUnitaireHT > 0 ? formatCHF(draft.prixUnitaireHT) : draft.prixUnitaireHT.toFixed(2);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white/50">Prestation {ligneIndex + 1}</span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white"
            onClick={() => onOpenEditor("description")}
            aria-label={`Modifier la ligne ${ligneIndex + 1}`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400/70 hover:text-red-400"
              onClick={onRemove}
              aria-label="Supprimer la ligne"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <button
        type="button"
        className={cn(cellButtonClass, "h-auto min-h-9 py-2")}
        title={draft.description || "Ajouter une description"}
        onClick={() => onOpenEditor("description")}
      >
        {descriptionDisplay}
      </button>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactCell
          label="Quantité"
          value={formatQuantiteDisplay(draft.quantite)}
          title={formatQuantiteDisplay(draft.quantite)}
          onClick={() => onOpenEditor("quantite")}
        />
        <CompactCell
          label="Unité"
          value={draft.unite}
          title={uniteDisplayLabel(draft.unite)}
          onClick={() => onOpenEditor("unite")}
        />
        <CompactCell
          label="PU HT (CHF)"
          value={prixDisplay}
          title={prixDisplay}
          onClick={() => onOpenEditor("prixUnitaireHT")}
        />
        <CompactCell
          label="TVA %"
          value={`${draft.tauxTVA}%`}
          title={`TVA ${draft.tauxTVA}%`}
          onClick={() => onOpenEditor("tauxTVA")}
        />
      </div>
      <button
        type="button"
        className="w-full text-right text-xs text-white/60 hover:text-white/80"
        onClick={() => onOpenEditor("prixUnitaireHT")}
      >
        Total HT : <span className="font-semibold text-white">{formatCHF(totalHT)}</span>
      </button>
    </div>
  );
}

export function LignePrestationRowCompact({
  layout = "grid",
  ...props
}: LignePrestationRowCompactProps) {
  if (layout === "stacked") {
    return <StackedRow {...props} />;
  }
  return <GridRow {...props} />;
}
