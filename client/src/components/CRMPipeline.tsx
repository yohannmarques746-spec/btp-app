import { useRef, useState } from "react";
import type { Chantier } from "@/context/ChantiersContext";
import type { FactureRecord } from "@/hooks/useFactures";
import type { Devis } from "@/types/devis";
import type { CrmColumn, CrmProspect, PendingSendContext } from "@/types/crm";
import { isCrmMailColumn } from "@/types/crm";
import { getActiveChantiersForClient } from "@/lib/crmChantiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { sendCrmEmail } from "@/lib/crmEmail";
import { ChantierPickerModal } from "@/components/crm/ChantierPickerModal";
import { InvoiceModal } from "@/components/crm/InvoiceModal";

const DEFAULT_RELANCE =
  "Bonjour, je souhaite faire un suivi concernant notre échange précédent...";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface CRMPipelineProps {
  columns: CrmColumn[];
  setColumns: React.Dispatch<React.SetStateAction<CrmColumn[]>>;
  pendingSendContext: PendingSendContext | null;
  setPendingSendContext: React.Dispatch<React.SetStateAction<PendingSendContext | null>>;
  chantiers: Chantier[];
  devisList: Devis[];
  factures: FactureRecord[];
}

// Shared card renderer for a single kanban column
interface KanbanColProps {
  column: CrmColumn;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (id: string) => void;
  handleDragStart: (p: CrmProspect, colId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}
function KanbanCol({ column, handleDragOver, handleDrop, handleDragStart, className, style }: KanbanColProps) {
  return (
    <Card
      className={`bg-black/20 backdrop-blur-xl border border-white/10 text-white${className ? ` ${className}` : ''}`}
      style={style}
      onDragOver={handleDragOver}
      onDrop={() => handleDrop(column.id)}
    >
      <CardHeader>
        <CardTitle className="text-sm">{column.name}</CardTitle>
        <Badge variant="secondary" className="mt-2">
          {column.items.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="min-h-[200px] space-y-2">
          {column.items.map((prospect) => (
            <motion.div
              key={prospect.id}
              draggable
              onDragStart={() => handleDragStart(prospect, column.id)}
              className="p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg cursor-move hover:bg-white/10 transition-all text-white"
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">{prospect.name}</p>
                <div className="flex items-center gap-1 text-xs text-white/70">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{prospect.email}</span>
                </div>
                {prospect.phone && (
                  <div className="flex items-center gap-1 text-xs text-white/70">
                    <Phone className="h-3 w-3" />
                    <span>{prospect.phone}</span>
                  </div>
                )}
                {prospect.company && (
                  <p className="text-xs text-white/70">{prospect.company}</p>
                )}
              </div>
            </motion.div>
          ))}
          {column.items.length === 0 && (
            <p className="text-xs text-white/70 text-center py-8">Aucun prospect</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CRMPipeline({
  columns,
  setColumns,
  pendingSendContext,
  setPendingSendContext,
  chantiers,
  devisList,
  factures,
}: CRMPipelineProps) {
  const { toast } = useToast();
  const suppressPickerDismissRef = useRef(false);

  const [draggedItem, setDraggedItem] = useState<{ prospect: CrmProspect; columnId: string } | null>(
    null,
  );
  const [showChantierPicker, setShowChantierPicker] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<CrmProspect | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [relanceText, setRelanceText] = useState<string>(DEFAULT_RELANCE);
  const [quoteSending, setQuoteSending] = useState(false);
  const [followupSending, setFollowupSending] = useState(false);

  const handleChantierPickerOpenChange = (open: boolean) => {
    if (!open && !suppressPickerDismissRef.current) {
      setDraggedItem(null);
      setPendingSendContext(null);
    }
    setShowChantierPicker(open);
  };

  const openMailModals = (targetColumnId: string, prospect: CrmProspect) => {
    setSelectedProspect(prospect);
    setSelectedColumn(targetColumnId);
    if (targetColumnId === "quote") {
      setShowQuoteModal(true);
      return;
    }
    if (targetColumnId === "invoice") {
      setShowInvoiceModal(true);
      return;
    }
    if (targetColumnId.startsWith("followup")) {
      setRelanceText(DEFAULT_RELANCE);
      setShowFollowupModal(true);
    }
  };

  const handleChantierPickConfirm = (ctx: PendingSendContext) => {
    suppressPickerDismissRef.current = true;
    setPendingSendContext(ctx);
    setShowChantierPicker(false);
    setSelectedProspect(ctx.prospect);
    setSelectedColumn(ctx.targetColumn);
    if (ctx.targetColumn === "quote") setShowQuoteModal(true);
    else if (ctx.targetColumn === "invoice") setShowInvoiceModal(true);
    else if (ctx.targetColumn.startsWith("followup")) {
      setRelanceText(DEFAULT_RELANCE);
      setShowFollowupModal(true);
    }
    window.setTimeout(() => {
      suppressPickerDismissRef.current = false;
    }, 0);
  };

  const handleDragStart = (prospect: CrmProspect, columnId: string) => {
    setDraggedItem({ prospect, columnId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetColumnId: string) => {
    if (!draggedItem) return;

    const { prospect, columnId: sourceColumnId } = draggedItem;

    if (isCrmMailColumn(targetColumnId)) {
      if (!prospect.clientId) {
        openMailModals(targetColumnId, prospect);
        return;
      }
      const active = getActiveChantiersForClient(chantiers, prospect.clientId);
      if (active.length > 2) {
        setPendingSendContext({ prospect, targetColumn: targetColumnId });
        setShowChantierPicker(true);
        return;
      }
      openMailModals(targetColumnId, prospect);
      return;
    }

    setColumns((prev) => {
      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            items: col.items.filter((item) => item.id !== prospect.id),
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            items: [...col.items, prospect],
          };
        }
        return col;
      });
    });

    setDraggedItem(null);
  };

  const commitQuotePlacement = () => {
    if (!draggedItem || !selectedProspect) return;

    setColumns((prev) => {
      return prev.map((col) => {
        if (col.id === draggedItem.columnId) {
          return {
            ...col,
            items: col.items.filter((item) => item.id !== selectedProspect.id),
          };
        }
        if (col.id === "quote") {
          return {
            ...col,
            items: [...col.items, selectedProspect],
          };
        }
        return col;
      });
    });

    setShowQuoteModal(false);
    setSelectedProspect(null);
    setDraggedItem(null);
    setPendingSendContext(null);
  };

  const commitFollowupPlacement = () => {
    if (!draggedItem || !selectedProspect) return;

    setColumns((prev) => {
      return prev.map((col) => {
        if (col.id === draggedItem.columnId) {
          return {
            ...col,
            items: col.items.filter((item) => item.id !== selectedProspect.id),
          };
        }
        if (col.id === selectedColumn) {
          return {
            ...col,
            items: [...col.items, selectedProspect],
          };
        }
        return col;
      });
    });

    setShowFollowupModal(false);
    setSelectedProspect(null);
    setSelectedColumn("");
    setDraggedItem(null);
    setPendingSendContext(null);
  };

  const handleInvoiceModalClose = () => {
    if (draggedItem && selectedProspect) {
      const fromCol = draggedItem.columnId;
      const prospectToMove = selectedProspect;
      setColumns((prev) => {
        return prev.map((col) => {
          if (col.id === fromCol) {
            return {
              ...col,
              items: col.items.filter((item) => item.id !== prospectToMove.id),
            };
          }
          if (col.id === "invoice") {
            return {
              ...col,
              items: [...col.items, prospectToMove],
            };
          }
          return col;
        });
      });
    }
    setShowInvoiceModal(false);
    setSelectedProspect(null);
    setDraggedItem(null);
    setPendingSendContext(null);
  };

  const selectedDevis =
    pendingSendContext?.devisId != null
      ? devisList.find((d) => d.id === pendingSendContext.devisId)
      : undefined;
  const selectedChantierCtx =
    pendingSendContext?.chantierId != null
      ? chantiers.find((c) => c.id === pendingSendContext.chantierId)
      : undefined;

  const handleQuoteSend = async () => {
    if (!draggedItem || !selectedProspect) return;
    setQuoteSending(true);
    try {
      const name = escapeHtml(selectedProspect.name);
      const devisLine = selectedDevis
        ? `<p><strong>Devis ${escapeHtml(selectedDevis.numero)}</strong> — ${escapeHtml(selectedDevis.objet || "")}</p>`
        : "";
      const chantierLine = selectedChantierCtx
        ? `<p>Chantier : ${escapeHtml(selectedChantierCtx.nom)}</p>`
        : "";
      const html = `
<p>Bonjour ${name},</p>
${chantierLine}
${devisLine}
<p>Veuillez trouver ci-dessous un récapitulatif provisoire. Le détail complet de votre devis vous sera communiqué prochainement.</p>
<p><em>Aperçu — montants à confirmer.</em></p>
<p>Cordialement,</p>
`.trim();

      const subject = selectedDevis
        ? `Devis ${selectedDevis.numero} - ${selectedProspect.name}`
        : `Devis - ${selectedProspect.name}`;

      await sendCrmEmail({
        to: selectedProspect.email.trim(),
        subject: subject.slice(0, 200),
        html,
        type: "devis",
      });

      toast({
        title: "Devis envoyé",
        description: "L'email a été envoyé avec succès.",
      });
      commitQuotePlacement();
    } catch (e) {
      toast({
        title: "Erreur",
        description:
          e instanceof Error
            ? e.message
            : "Impossible d'envoyer l'email. Vérifiez la configuration ou réessayez plus tard.",
      });
    } finally {
      setQuoteSending(false);
    }
  };

  const handleFollowupSend = async () => {
    if (!draggedItem || !selectedProspect) return;
    setFollowupSending(true);
    try {
      const subject = selectedChantierCtx
        ? `Relance — ${selectedProspect.name} (${selectedChantierCtx.nom})`
        : `Relance - ${selectedProspect.name}`;

      await sendCrmEmail({
        to: selectedProspect.email.trim(),
        subject: subject.slice(0, 200),
        text:
          (selectedChantierCtx ? `Chantier : ${selectedChantierCtx.nom}\n\n` : "") + relanceText,
        type: "relance",
      });

      toast({
        title: "Relance envoyée",
        description: "L'email a été envoyé avec succès.",
      });
      commitFollowupPlacement();
    } catch (e) {
      toast({
        title: "Erreur",
        description:
          e instanceof Error
            ? e.message
            : "Impossible d'envoyer l'email. Vérifiez la configuration ou réessayez plus tard.",
      });
    } finally {
      setFollowupSending(false);
    }
  };

  const pickerProspect = pendingSendContext?.prospect;
  const pickerClientId = pickerProspect?.clientId;
  const pickerActifs =
    pickerClientId != null ? getActiveChantiersForClient(chantiers, pickerClientId) : [];

  return (
    <div className="space-y-6">
      {/* Mobile: horizontal kanban scroll — all columns reachable without deep vertical scroll */}
      <div className="md:hidden overflow-x-auto pb-2 -mx-3 px-3">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {columns.map((column) => (
            <KanbanCol
              key={column.id}
              column={column}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragStart={handleDragStart}
              style={{ width: 260 }}
              className="flex-none"
            />
          ))}
        </div>
      </div>

      {/* Desktop: responsive grid */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {columns.map((column) => (
          <KanbanCol
            key={column.id}
            column={column}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleDragStart={handleDragStart}
          />
        ))}
      </div>

      {showChantierPicker &&
        pickerProspect &&
        pickerClientId &&
        pendingSendContext && (
          <ChantierPickerModal
            open={showChantierPicker}
            onOpenChange={handleChantierPickerOpenChange}
            prospect={pickerProspect}
            targetColumn={pendingSendContext.targetColumn}
            clientId={pickerClientId}
            activeChantiers={pickerActifs}
            devisList={devisList}
            factures={factures}
            onConfirm={handleChantierPickConfirm}
          />
        )}

      {showQuoteModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white">
            <CardHeader>
              <CardTitle>Visualisation du Devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Destinataire:</p>
                <p className="text-sm">
                  {selectedProspect.name} ({selectedProspect.email})
                </p>
              </div>
              {selectedChantierCtx && (
                <p className="text-xs text-white/70">Chantier : {selectedChantierCtx.nom}</p>
              )}
              {selectedDevis && (
                <p className="text-sm text-white/90">
                  Devis {selectedDevis.numero} — {selectedDevis.objet || "—"}
                </p>
              )}
              <div className="border border-white/10 rounded-lg p-4 bg-black/20 backdrop-blur-md">
                <p className="text-sm text-white/70 mb-4">Aperçu du devis à envoyer...</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Preparation</span>
                    <span>—</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{selectedDevis ? `${selectedDevis.totalTTC.toFixed(2)} CHF` : "—"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={quoteSending}
                  onClick={() => {
                    setShowQuoteModal(false);
                    setSelectedProspect(null);
                    setDraggedItem(null);
                    setPendingSendContext(null);
                  }}
                >
                  Annuler
                </Button>
                <Button onClick={() => void handleQuoteSend()} disabled={quoteSending}>
                  {quoteSending ? "Envoi…" : "Envoyer le Devis"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <InvoiceModal
        open={showInvoiceModal && !!selectedProspect}
        prospect={selectedProspect}
        sendContext={pendingSendContext}
        factures={factures}
        onClose={handleInvoiceModalClose}
      />

      {showFollowupModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white">
            <CardHeader>
              <CardTitle>Message de Relance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Destinataire:</p>
                <p className="text-sm">
                  {selectedProspect.name} ({selectedProspect.email})
                </p>
              </div>
              {selectedChantierCtx && (
                <p className="text-xs text-white/70">Chantier : {selectedChantierCtx.nom}</p>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Message (modifiable):</label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 min-h-[150px]"
                  value={relanceText}
                  onChange={(e) => setRelanceText(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={followupSending}
                  onClick={() => {
                    setShowFollowupModal(false);
                    setSelectedProspect(null);
                    setSelectedColumn("");
                    setDraggedItem(null);
                    setPendingSendContext(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => void handleFollowupSend()}
                  disabled={followupSending}
                >
                  {followupSending ? "Envoi…" : "Envoyer la Relance"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
