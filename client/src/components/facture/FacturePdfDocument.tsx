import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Emetteur, TVAParTaux } from "@/types/devis";
import { formatCHF } from "@/utils/chf";

export interface LigneFacturePdf {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA: number;
  totalHT: number;
}

export interface FacturePdfProps {
  numero: string;
  dateEmission: string;
  dateEcheance: string;
  objet: string;
  lignes: LigneFacturePdf[];
  notes?: string;
  conditionsPaiement?: string;
  emetteur: Emetteur;
  client: {
    nom: string;
    adresse: string;
    npa: string;
    ville: string;
    email?: string;
    telephone?: string;
    contact?: string;
  };
  sousTotalHT: number;
  tvaParTaux: TVAParTaux[];
  montantTVA: number;
  totalTTC: number;
  nonAssujettiTVA?: boolean;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  titleSub: { fontSize: 10, color: "#6b7280", marginBottom: 8 },
  section: { marginBottom: 14 },
  block: { borderWidth: 1, borderColor: "#e5e7eb", padding: 8, borderRadius: 4, flex: 1 },
  subtitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  cDesc: { flex: 3 },
  cQty: { flex: 1, textAlign: "right" },
  cUnit: { flex: 1, textAlign: "right" },
  cPht: { flex: 1.5, textAlign: "right" },
  cTva: { flex: 1, textAlign: "right" },
  cTot: { flex: 1.5, textAlign: "right" },
  totalBox: { width: 260, marginLeft: "auto", marginTop: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalMain: {
    borderTopWidth: 1.5,
    borderTopColor: "#111827",
    marginTop: 4,
    paddingTop: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 10 },
  legal: { marginTop: 10, fontSize: 8.5, color: "#6b7280" },
  paymentBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#d1fae5",
    backgroundColor: "#f0fdf4",
    padding: 10,
    borderRadius: 4,
  },
  paymentTitle: { fontSize: 10, fontWeight: 700, color: "#065f46", marginBottom: 4 },
  paymentText: { fontSize: 9.5, color: "#064e3b" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: "#fef9c3",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  badgeText: { fontSize: 9, color: "#854d0e", fontWeight: 700 },
});

export function FacturePdfDocument({
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
}: FacturePdfProps) {
  const isNonAssujetti = Boolean(nonAssujettiTVA ?? emetteur.nonAssujettiTVA);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* En-tête : titre + logo */}
        <View style={[styles.row, styles.section]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>FACTURE {numero}</Text>
            <Text style={styles.titleSub}>Date d'emission : {dateEmission}</Text>
            <Text style={styles.titleSub}>Date d'echeance : {dateEcheance}</Text>
          </View>
          {emetteur.logo ? (
            <Image src={emetteur.logo} style={{ width: 84, height: 52, objectFit: "contain" }} />
          ) : null}
        </View>

        {/* Émetteur / Client */}
        <View style={[styles.row, styles.section]}>
          <View style={styles.block}>
            <Text style={styles.subtitle}>Emetteur</Text>
            <Text>{emetteur.nom}</Text>
            <Text>{emetteur.adresse}</Text>
            <Text>{emetteur.npa} {emetteur.ville}</Text>
            {emetteur.ide ? <Text>IDE : {emetteur.ide}</Text> : null}
            {emetteur.email ? <Text>{emetteur.email}</Text> : null}
            {emetteur.telephone ? <Text>{emetteur.telephone}</Text> : null}
            {emetteur.iban ? <Text>IBAN : {emetteur.iban}</Text> : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.subtitle}>Facture a</Text>
            <Text>{client.nom}</Text>
            <Text>{client.adresse}</Text>
            <Text>{client.npa} {client.ville}</Text>
            {client.contact ? <Text>Contact : {client.contact}</Text> : null}
            {client.email ? <Text>{client.email}</Text> : null}
            {client.telephone ? <Text>{client.telephone}</Text> : null}
          </View>
        </View>

        {/* Objet */}
        {objet ? (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Objet</Text>
            <Text>{objet}</Text>
          </View>
        ) : null}

        {/* Tableau des prestations */}
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cDesc, { fontWeight: 700 }]}>Prestation</Text>
            <Text style={[styles.cQty, { fontWeight: 700 }]}>Qte</Text>
            <Text style={[styles.cUnit, { fontWeight: 700 }]}>Unite</Text>
            <Text style={[styles.cPht, { fontWeight: 700 }]}>PU HT</Text>
            <Text style={[styles.cTva, { fontWeight: 700 }]}>TVA</Text>
            <Text style={[styles.cTot, { fontWeight: 700 }]}>Total HT</Text>
          </View>
          {lignes.map((ligne) => (
            <View key={ligne.id} style={styles.tableRow}>
              <Text style={styles.cDesc}>{ligne.description}</Text>
              <Text style={styles.cQty}>{ligne.quantite}</Text>
              <Text style={styles.cUnit}>{ligne.unite}</Text>
              <Text style={styles.cPht}>{formatCHF(ligne.prixUnitaireHT)}</Text>
              <Text style={styles.cTva}>{ligne.tauxTVA}%</Text>
              <Text style={styles.cTot}>{formatCHF(ligne.totalHT)}</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text style={{ color: "#374151" }}>Sous-total HT</Text>
            <Text>{formatCHF(sousTotalHT)}</Text>
          </View>
          {isNonAssujetti ? (
            <View style={styles.totalRow}>
              <Text style={{ color: "#374151" }}>TVA</Text>
              <Text>non assujetti a la TVA</Text>
            </View>
          ) : (
            tvaParTaux.map((tva) => (
              <View style={styles.totalRow} key={String(tva.taux)}>
                <Text style={{ color: "#374151" }}>TVA {tva.taux}%</Text>
                <Text>{formatCHF(tva.montantTVA)}</Text>
              </View>
            ))
          )}
          <View style={[styles.totalRow, styles.totalMain]}>
            <Text>Total TTC</Text>
            <Text>{formatCHF(totalTTC)}</Text>
          </View>
        </View>

        {/* Informations de paiement */}
        {emetteur.iban ? (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Informations de paiement</Text>
            <Text style={styles.paymentText}>IBAN : {emetteur.iban}</Text>
            <Text style={styles.paymentText}>Beneficiaire : {emetteur.nom}</Text>
            <Text style={styles.paymentText}>Montant : {formatCHF(totalTTC)}</Text>
            <Text style={styles.paymentText}>Reference : {numero}</Text>
            {dateEcheance ? (
              <Text style={styles.paymentText}>A regler avant le : {dateEcheance}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Conditions & Notes */}
        {(conditionsPaiement || notes) ? (
          <View style={styles.section}>
            {conditionsPaiement ? (
              <Text style={styles.legal}>Conditions de paiement : {conditionsPaiement}</Text>
            ) : null}
            {notes ? <Text style={styles.legal}>Notes : {notes}</Text> : null}
          </View>
        ) : null}

        {/* Mentions légales */}
        <Text style={styles.legal}>
          {isNonAssujetti
            ? "Entreprise non assujettie a la TVA (CA inferieur a CHF 100'000/an)."
            : "TVA appliquee selon taux suisses en vigueur."}
        </Text>
      </Page>
    </Document>
  );
}
