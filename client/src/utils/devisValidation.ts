import type { Devis, Emetteur, LignePrestation } from "@/types/devis";

export const IDE_REGEX = /^CHE-\d{3}\.\d{3}\.\d{3}$/;

export function isValidIDE(ide: string): boolean {
  return IDE_REGEX.test(ide);
}

export function validateLigne(ligne: LignePrestation): string[] {
  const errors: string[] = [];
  if (!ligne.description.trim()) errors.push("Description requise");
  if (ligne.quantite <= 0) errors.push("Quantite > 0 requise");
  if (ligne.prixUnitaireHT <= 0) errors.push("Prix unitaire > 0 requis");
  return errors;
}

export function validateEmetteur(emetteur: Emetteur): string[] {
  const errors: string[] = [];
  if (!emetteur.nom.trim()) errors.push("Nom emetteur requis");
  if (!emetteur.adresse.trim()) errors.push("Adresse emetteur requise");
  if (!emetteur.npa.trim()) errors.push("NPA emetteur requis");
  if (!emetteur.ville.trim()) errors.push("Ville emetteur requise");
  if (!isValidIDE(emetteur.ide)) errors.push("Numero IDE invalide");
  if (!emetteur.email.trim()) errors.push("Email emetteur requis");
  if (!emetteur.telephone.trim()) errors.push("Telephone emetteur requis");
  return errors;
}

export function validateDevis(devis: Partial<Devis>): string[] {
  const errors: string[] = [];

  if (!devis.dateEmission) errors.push("Date d'emission requise");
  if (!devis.emetteur?.nom?.trim()) errors.push("Nom emetteur requis");
  if (!devis.client?.nom?.trim()) errors.push("Nom client requis");
  if (!devis.lignes || devis.lignes.length < 1) errors.push("Au moins une ligne de prestation est requise");

  if (devis.lignes) {
    devis.lignes.forEach((ligne) => {
      errors.push(...validateLigne(ligne));
    });
  }

  return errors;
}
