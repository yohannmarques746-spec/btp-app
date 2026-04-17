import { useEffect, useMemo, useState } from "react";
import type { Chantier } from "@/context/ChantiersContext";
import {
  devisListForCrmClient,
  normalizeDevisAssociesIds,
  sortDevisLinkedFirst,
} from "@/lib/crmChantiers";
import type { Devis } from "@/types/devis";
import type { FactureRecord } from "@/hooks/useFactures";
import type { CrmProspect, PendingSendContext } from "@/types/crm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface ChantierPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: CrmProspect;
  targetColumn: string;
  clientId: string;
  activeChantiers: Chantier[];
  devisList: Devis[];
  factures: FactureRecord[];
  onConfirm: (ctx: PendingSendContext) => void;
}

export function ChantierPickerModal({
  open,
  onOpenChange,
  prospect,
  targetColumn,
  clientId,
  activeChantiers,
  devisList,
  factures,
  onConfirm,
}: ChantierPickerModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [chantierId, setChantierId] = useState<string | null>(null);
  const [devisId, setDevisId] = useState<string | null>(null);
  const [factureId, setFactureId] = useState<string | null>(null);

  const isFollowup = targetColumn.startsWith("followup");
  const isQuote = targetColumn === "quote";
  const isInvoice = targetColumn === "invoice";

  const selectedChantier = useMemo(
    () => activeChantiers.find((c) => c.id === chantierId) ?? null,
    [activeChantiers, chantierId],
  );

  const devisForClient = useMemo(
    () => devisListForCrmClient(devisList, clientId, prospect),
    [devisList, clientId, prospect],
  );

  const linkedSet = useMemo(() => {
    return new Set(normalizeDevisAssociesIds(selectedChantier?.devisAssocies as unknown));
  }, [selectedChantier]);

  const devisSorted = useMemo(
    () => sortDevisLinkedFirst(devisForClient, linkedSet),
    [devisForClient, linkedSet],
  );

  const facturesClient = useMemo(
    () => factures.filter((f) => f.clientId === clientId),
    [factures, clientId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setChantierId(null);
    setDevisId(null);
    setFactureId(null);
  }, [open, targetColumn, prospect.id]);

  const canConfirmStep1 = chantierId != null;
  const canConfirmStep2 =
    isFollowup ||
    (isQuote && devisId != null) ||
    (isInvoice && factureId != null);

  const handleNext = () => {
    if (isFollowup) {
      if (!chantierId) return;
      onConfirm({
        prospect,
        targetColumn,
        chantierId,
      });
      return;
    }
    if (step === 1 && canConfirmStep1) {
      setStep(2);
    }
  };

  const handleFinish = () => {
    if (!chantierId) return;
    if (isQuote) {
      if (!devisId) return;
      onConfirm({ prospect, targetColumn, chantierId, devisId });
    } else if (isInvoice) {
      if (!factureId) return;
      onConfirm({ prospect, targetColumn, chantierId, factureId });
    }
  };

  const title =
    step === 1
      ? "Choisir le chantier"
      : isQuote
        ? "Choisir le devis à envoyer"
        : "Choisir la facture à envoyer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-white/70">
            {prospect.name} — plusieurs chantiers actifs nécessitent une précision.
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2">
            {activeChantiers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChantierId(c.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-colors",
                  chantierId === c.id
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-white/10 bg-black/20 hover:bg-white/5",
                )}
              >
                <p className="font-medium text-sm">{c.nom}</p>
                <p className="text-xs text-white/60">{c.statut}</p>
              </button>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={() => handleNext()} disabled={!canConfirmStep1}>
                {isFollowup ? "Confirmer" : "Suivant"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && isQuote && (
          <div className="space-y-2">
            {devisSorted.length === 0 && (
              <p className="text-sm text-white/70">Aucun devis trouvé pour ce client.</p>
            )}
            {devisSorted.map((d) => {
              const linked = linkedSet.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDevisId(d.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors",
                    devisId === d.id
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-white/10 bg-black/20 hover:bg-white/5",
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{d.numero}</span>
                    {linked && (
                      <Badge variant="secondary" className="text-[10px]">
                        Lié au chantier
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/60">{d.objet || "—"}</p>
                </button>
              );
            })}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button onClick={() => handleFinish()} disabled={!canConfirmStep2}>
                Confirmer
              </Button>
            </div>
          </div>
        )}

        {step === 2 && isInvoice && (
          <div className="space-y-2">
            {facturesClient.length === 0 && (
              <p className="text-sm text-white/70">Aucune facture pour ce client.</p>
            )}
            {facturesClient.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFactureId(f.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-colors",
                  factureId === f.id
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-white/10 bg-black/20 hover:bg-white/5",
                )}
              >
                <p className="font-medium text-sm">{f.numero}</p>
                <p className="text-xs text-white/60">{f.montantTTC.toFixed(2)} CHF</p>
              </button>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button onClick={() => handleFinish()} disabled={!canConfirmStep2}>
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
