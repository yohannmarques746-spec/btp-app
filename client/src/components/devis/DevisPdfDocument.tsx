import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Devis } from "@/types/devis";
import { calculateTVAParTaux } from "@/utils/devisCalculs";
import { formatCHF } from "@/utils/chf";

interface DevisPdfDocumentProps {
  devis: Devis;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  section: { marginBottom: 14 },
  block: { borderWidth: 1, borderColor: "#e5e7eb", padding: 8, borderRadius: 4, flex: 1 },
  subtitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 5 },
  cDesc: { flex: 3 },
  cQty: { flex: 1, textAlign: "right" },
  cUnit: { flex: 1, textAlign: "right" },
  cPht: { flex: 1.5, textAlign: "right" },
  cTva: { flex: 1, textAlign: "right" },
  cTot: { flex: 1.5, textAlign: "right" },
  totalBox: { width: 250, marginLeft: "auto", marginTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalMain: { borderTopWidth: 1, borderTopColor: "#111827", marginTop: 4, paddingTop: 4, fontSize: 12, fontWeight: 700 },
  legal: { marginTop: 10, fontSize: 9, color: "#4b5563" },
  signatureWrap: { marginTop: 18, borderTopWidth: 1, borderTopColor: "#d1d5db", paddingTop: 8 },
});

export function DevisPdfDocument({ devis }: DevisPdfDocumentProps) {
  const tvaParTaux = calculateTVAParTaux(devis.lignes);
  const isNonAssujetti = Boolean(devis.emetteur.nonAssujettiTVA);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, styles.section]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>DEVIS {devis.numero}</Text>
            <Text>Date d'emission: {devis.dateEmission}</Text>
            <Text>Valable jusqu'au: {devis.dateExpiration}</Text>
          </View>
          {devis.emetteur.logo ? <Image src={devis.emetteur.logo} style={{ width: 84, height: 52, objectFit: "contain" }} /> : null}
        </View>

        <View style={[styles.row, styles.section]}>
          <View style={styles.block}>
            <Text style={styles.subtitle}>Emetteur</Text>
            <Text>{devis.emetteur.nom}</Text>
            <Text>{devis.emetteur.adresse}</Text>
            <Text>{devis.emetteur.npa} {devis.emetteur.ville}</Text>
            <Text>IDE: {devis.emetteur.ide || "-"}</Text>
            <Text>{devis.emetteur.email}</Text>
            <Text>{devis.emetteur.telephone}</Text>
            {devis.emetteur.iban ? <Text>IBAN: {devis.emetteur.iban}</Text> : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.subtitle}>Client</Text>
            <Text>{devis.client.nom}</Text>
            <Text>{devis.client.adresse}</Text>
            <Text>{devis.client.npa} {devis.client.ville}</Text>
            {devis.client.contact ? <Text>Contact: {devis.client.contact}</Text> : null}
            {devis.client.email ? <Text>{devis.client.email}</Text> : null}
            {devis.client.telephone ? <Text>{devis.client.telephone}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Objet</Text>
          <Text>{devis.objet || "-"}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.cDesc}>Prestation</Text>
            <Text style={styles.cQty}>Qte</Text>
            <Text style={styles.cUnit}>Unite</Text>
            <Text style={styles.cPht}>PU HT</Text>
            <Text style={styles.cTva}>TVA</Text>
            <Text style={styles.cTot}>Total HT</Text>
          </View>
          {devis.lignes.map((ligne) => (
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

        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text>Sous-total HT</Text>
            <Text>{formatCHF(devis.sousTotalHT)}</Text>
          </View>
          {isNonAssujetti ? (
            <View style={styles.totalRow}>
              <Text>TVA</Text>
              <Text>non assujetti a la TVA</Text>
            </View>
          ) : (
            tvaParTaux.map((tva) => (
              <View style={styles.totalRow} key={String(tva.taux)}>
                <Text>TVA {tva.taux}%</Text>
                <Text>{formatCHF(tva.montantTVA)}</Text>
              </View>
            ))
          )}
          <View style={[styles.totalRow, styles.totalMain]}>
            <Text>Total TTC</Text>
            <Text>{formatCHF(devis.totalTTC)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Conditions</Text>
          <Text>Conditions de paiement: {devis.conditionsPaiement || "-"}</Text>
          {devis.delaiExecution ? <Text>Delai d'execution: {devis.delaiExecution}</Text> : null}
          {devis.notes ? <Text>Notes: {devis.notes}</Text> : null}
          {devis.devisPayant ? <Text>Devis payant: {formatCHF(devis.montantDevis || 0)}</Text> : null}
        </View>

        <Text style={styles.legal}>
          Ce devis est valable jusqu'au {devis.dateExpiration}. Ecart tolere entre devis et facture finale: maximum 10%.
        </Text>
        <Text style={styles.legal}>
          {isNonAssujetti ? "Entreprise non assujettie a la TVA (CA inferieur a 100'000 CHF/an)." : "TVA appliquee selon taux suisses en vigueur."}
        </Text>

        <View style={styles.signatureWrap}>
          <Text style={styles.subtitle}>BON POUR ACCORD</Text>
          <Text>Date: ____________________     Signature client: ____________________</Text>
        </View>
      </Page>
    </Document>
  );
}
