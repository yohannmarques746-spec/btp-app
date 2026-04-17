import type { CrmProspect, PendingSendContext } from "@/types/crm";
import type { FactureRecord } from "@/hooks/useFactures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface InvoiceModalProps {
  open: boolean;
  prospect: CrmProspect | null;
  sendContext: PendingSendContext | null;
  factures: FactureRecord[];
  onClose: () => void;
}

export function InvoiceModal({ open, prospect, sendContext, factures, onClose }: InvoiceModalProps) {
  if (!open || !prospect) return null;

  const list =
    prospect.clientId != null
      ? factures.filter((f) => f.clientId === prospect.clientId)
      : [];

  const selectedFacture =
    sendContext?.factureId != null
      ? factures.find((f) => f.id === sendContext.factureId)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Envoi de facture pour {prospect.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!prospect.clientId && (
            <p className="text-sm text-amber-200/90">
              Ce prospect n’est pas lié à un client de l’app (pas de clientId). Ajoutez-le depuis Clients ou
              associez un client pour filtrer les factures.
            </p>
          )}
          <div>
            <p className="text-sm font-medium mb-2">Destinataire</p>
            <p className="text-sm">
              {prospect.name} ({prospect.email})
            </p>
          </div>
          {sendContext?.chantierId && (
            <p className="text-xs text-white/60">Contexte chantier enregistré (réf. interne).</p>
          )}
          {selectedFacture && (
            <div className="border border-white/10 rounded-lg p-3 bg-black/20">
              <p className="text-sm font-medium">Facture sélectionnée</p>
              <p className="text-sm text-white/80">
                {selectedFacture.numero} — {selectedFacture.montantTTC.toFixed(2)} CHF
              </p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium mb-2">Factures du client</p>
            {list.length === 0 ? (
              <p className="text-sm text-white/60">Aucune facture à afficher.</p>
            ) : (
              <ul className="space-y-2 text-sm text-white/80 max-h-48 overflow-y-auto">
                {list.map((f) => (
                  <li key={f.id} className="border border-white/10 rounded-md px-3 py-2">
                    {f.numero} — {f.montantTTC.toFixed(2)} CHF
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-sm text-white/60">
            Intégration e-mail à venir — le bouton d’envoi sera activé une fois Resend configuré.
          </p>
          {/* TODO: sendCrmEmail({ to: prospect.email, subject: `Facture #${numero} - ${prospect.name}`, html|text, type: ... }) */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button disabled title="Intégration e-mail à venir">
              Envoyer la facture
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
