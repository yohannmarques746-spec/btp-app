import type { FacturePdfProps } from "./FacturePdfDocument";
import { formatCHF } from "@/utils/chf";

export function FacturePreview(props: FacturePdfProps) {
  const {
    numero,
    dateEmission,
    dateEcheance,
    objet,
    lignes,
    notes,
    conditionsPaiement,
    emetteur,
    client,
    sousTotalHT,
    tvaParTaux,
    totalTTC,
    nonAssujettiTVA,
  } = props;

  const isNonAssujetti = Boolean(nonAssujettiTVA ?? emetteur.nonAssujettiTVA);

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-200 p-4">
      <div className="mx-auto max-w-[794px] bg-white p-8 shadow-lg text-slate-900 text-sm font-sans">

        {/* En-tête */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">FACTURE {numero}</h3>
            <p className="text-xs text-slate-500 mt-1">Date d'émission : {dateEmission || "—"}</p>
            <p className="text-xs text-slate-500">Date d'échéance : {dateEcheance || "—"}</p>
          </div>
          {emetteur.logo ? (
            <img src={emetteur.logo} alt="Logo" className="h-14 w-24 object-contain" />
          ) : null}
        </div>

        {/* Émetteur / Client */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded border border-slate-200 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Émetteur</p>
            <p className="font-semibold text-slate-900">{emetteur.nom || "—"}</p>
            <p className="text-slate-600">{emetteur.adresse}</p>
            <p className="text-slate-600">{emetteur.npa} {emetteur.ville}</p>
            {emetteur.ide ? <p className="text-slate-600">IDE : {emetteur.ide}</p> : null}
            {emetteur.email ? <p className="text-slate-600">{emetteur.email}</p> : null}
            {emetteur.telephone ? <p className="text-slate-600">{emetteur.telephone}</p> : null}
            {emetteur.iban ? <p className="text-slate-600 font-mono text-xs mt-1">IBAN : {emetteur.iban}</p> : null}
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Facturé à</p>
            <p className="font-semibold text-slate-900">{client.nom || "—"}</p>
            <p className="text-slate-600">{client.adresse}</p>
            <p className="text-slate-600">{client.npa} {client.ville}</p>
            {client.contact ? <p className="text-slate-600">Contact : {client.contact}</p> : null}
            {client.email ? <p className="text-slate-600">{client.email}</p> : null}
            {client.telephone ? <p className="text-slate-600">{client.telephone}</p> : null}
          </div>
        </div>

        {/* Objet */}
        {objet ? (
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Objet</p>
            <p className="rounded border border-slate-200 p-2 text-slate-700">{objet}</p>
          </div>
        ) : null}

        {/* Tableau des prestations */}
        <div className="mb-4 overflow-hidden rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600 text-xs">
              <tr>
                <th className="px-2 py-2">Prestation</th>
                <th className="px-2 py-2 text-right">Qté</th>
                <th className="px-2 py-2 text-right">Unité</th>
                <th className="px-2 py-2 text-right">PU HT</th>
                <th className="px-2 py-2 text-right">TVA</th>
                <th className="px-2 py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-slate-400 italic">
                    Aucune prestation ajoutée
                  </td>
                </tr>
              ) : (
                lignes.map((ligne) => (
                  <tr key={ligne.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-slate-700">{ligne.description}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{ligne.quantite}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{ligne.unite}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{formatCHF(ligne.prixUnitaireHT)}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{ligne.tauxTVA}%</td>
                    <td className="px-2 py-2 text-right font-medium text-slate-900">{formatCHF(ligne.totalHT)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="ml-auto mb-4 w-full max-w-xs space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Sous-total HT</span>
            <span className="font-medium">{formatCHF(sousTotalHT)}</span>
          </div>
          {isNonAssujetti ? (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">TVA</span>
              <span className="text-slate-900 italic">non assujetti à la TVA</span>
            </div>
          ) : (
            tvaParTaux.map((tva) => (
              <div key={String(tva.taux)} className="flex justify-between text-sm">
                <span className="text-slate-600">TVA {tva.taux}%</span>
                <span>{formatCHF(tva.montantTVA)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
            <span>Total TTC</span>
            <span>{formatCHF(totalTTC)}</span>
          </div>
        </div>

        {/* Bloc paiement */}
        {emetteur.iban ? (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-800 mb-1">Informations de paiement</p>
            <p className="text-xs text-green-700 font-mono">IBAN : {emetteur.iban}</p>
            <p className="text-xs text-green-700">Bénéficiaire : {emetteur.nom}</p>
            <p className="text-xs text-green-700">Montant : {formatCHF(totalTTC)} — Réf. : {numero}</p>
            {dateEcheance ? <p className="text-xs text-green-700">À régler avant le : {dateEcheance}</p> : null}
          </div>
        ) : null}

        <hr className="border-slate-200 my-4" />

        {/* Conditions & Notes */}
        {(conditionsPaiement || notes) ? (
          <div className="text-xs text-slate-500 space-y-1">
            {conditionsPaiement ? <p>Conditions de paiement : {conditionsPaiement}</p> : null}
            {notes ? <p>Notes : {notes}</p> : null}
          </div>
        ) : null}

        <p className="text-[10px] text-slate-400 mt-3">
          {isNonAssujetti
            ? "Entreprise non assujettie à la TVA (CA inférieur à CHF 100'000/an)."
            : "TVA appliquée selon taux suisses en vigueur."}
        </p>
      </div>
    </div>
  );
}
