import type { Devis } from "@/types/devis";
import { calculateTVAParTaux } from "@/utils/devisCalculs";
import { formatCHF } from "@/utils/chf";

interface DevisPreviewProps {
  devis: Devis;
}

export function DevisPreview({ devis }: DevisPreviewProps) {
  const tvaParTaux = calculateTVAParTaux(devis.lignes);
  const nonAssujetti = Boolean(devis.emetteur.nonAssujettiTVA);

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-200 p-4">
      <div className="mx-auto max-w-[794px] bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">DEVIS {devis.numero}</h3>
            <p className="text-sm text-slate-600">Date d'emission: {devis.dateEmission}</p>
            <p className="text-sm text-slate-600">Valable jusqu'au: {devis.dateExpiration}</p>
          </div>
          {devis.emetteur.logo ? (
            <img src={devis.emetteur.logo} alt="Logo emetteur" className="h-16 w-28 object-contain" />
          ) : null}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-600">Emetteur</p>
            <p className="font-medium text-slate-900">{devis.emetteur.nom}</p>
            <p className="text-sm text-slate-700">{devis.emetteur.adresse}</p>
            <p className="text-sm text-slate-700">{devis.emetteur.npa} {devis.emetteur.ville}</p>
            <p className="text-sm text-slate-700">IDE: {devis.emetteur.ide || "-"}</p>
            <p className="text-sm text-slate-700">{devis.emetteur.email}</p>
            <p className="text-sm text-slate-700">{devis.emetteur.telephone}</p>
            {devis.emetteur.iban ? <p className="text-sm text-slate-700">IBAN: {devis.emetteur.iban}</p> : null}
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-600">Client</p>
            <p className="font-medium text-slate-900">{devis.client.nom}</p>
            <p className="text-sm text-slate-700">{devis.client.adresse}</p>
            <p className="text-sm text-slate-700">{devis.client.npa} {devis.client.ville}</p>
            {devis.client.contact ? <p className="text-sm text-slate-700">Contact: {devis.client.contact}</p> : null}
            {devis.client.email ? <p className="text-sm text-slate-700">{devis.client.email}</p> : null}
            {devis.client.telephone ? <p className="text-sm text-slate-700">{devis.client.telephone}</p> : null}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-600">Objet</p>
          <p className="rounded border border-slate-200 p-2 text-sm text-slate-700">{devis.objet || "-"}</p>
        </div>

        <div className="mb-4 overflow-hidden rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-700">
              <tr>
                <th className="px-2 py-2">Prestation</th>
                <th className="px-2 py-2 text-right">Qte</th>
                <th className="px-2 py-2 text-right">Unite</th>
                <th className="px-2 py-2 text-right">PU HT</th>
                <th className="px-2 py-2 text-right">TVA</th>
                <th className="px-2 py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {devis.lignes.map((ligne) => (
                <tr key={ligne.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-slate-700">{ligne.description}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{ligne.quantite}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{ligne.unite}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{formatCHF(ligne.prixUnitaireHT)}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{ligne.tauxTVA}%</td>
                  <td className="px-2 py-2 text-right font-medium text-slate-900">{formatCHF(ligne.totalHT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mb-4 w-full max-w-sm space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-700">Sous-total HT</span>
            <span className="font-medium text-slate-900">{formatCHF(devis.sousTotalHT)}</span>
          </div>
          {nonAssujetti ? (
            <div className="flex justify-between">
              <span className="text-slate-700">TVA</span>
              <span className="text-slate-900">non assujetti a la TVA</span>
            </div>
          ) : (
            tvaParTaux.map((tva) => (
              <div key={String(tva.taux)} className="flex justify-between">
                <span className="text-slate-700">TVA {tva.taux}%</span>
                <span className="text-slate-900">{formatCHF(tva.montantTVA)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base">
            <span className="font-semibold text-slate-900">Total TTC</span>
            <span className="font-bold text-slate-900">{formatCHF(devis.totalTTC)}</span>
          </div>
        </div>

        <div className="mb-3 space-y-1 text-sm text-slate-700">
          <p><span className="font-medium">Conditions de paiement:</span> {devis.conditionsPaiement || "-"}</p>
          {devis.delaiExecution ? <p><span className="font-medium">Delai d'execution:</span> {devis.delaiExecution}</p> : null}
          {devis.notes ? <p><span className="font-medium">Notes:</span> {devis.notes}</p> : null}
          {devis.devisPayant ? <p><span className="font-medium">Devis payant:</span> {formatCHF(devis.montantDevis || 0)}</p> : null}
        </div>

        <div className="space-y-1 text-xs text-slate-600">
          <p>Ce devis est valable jusqu'au {devis.dateExpiration}.</p>
          <p>
            {nonAssujetti
              ? "Entreprise non assujettie a la TVA (chiffre d'affaires inferieur a 100'000 CHF/an)."
              : "TVA appliquee selon taux suisses en vigueur."}
          </p>
          <p>Le devis signe avec la mention Bon pour accord a valeur contractuelle. Ecart tolere max: 10%.</p>
        </div>

        <div className="mt-8 border-t border-slate-300 pt-4">
          <p className="font-semibold text-slate-900">BON POUR ACCORD</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-slate-700">
            <p>Date: ____________________</p>
            <p>Signature client: ____________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}
