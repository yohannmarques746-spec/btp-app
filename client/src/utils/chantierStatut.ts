/**
 * Calcule automatiquement le statut d'un chantier basé sur ses dates.
 * - Si la date de début est dans le futur → "planifié"
 * - Si la date de début est passée et pas de date de fin dépassée → "en cours"
 * - Si la date de fin est passée → "terminé"
 *
 * Retourne null si aucune date n'est disponible (on garde le statut manuel).
 */
export function getAutoStatut(
  dateDebut?: string | null,
  dateFin?: string | null,
  statutActuel?: string,
): 'planifié' | 'en cours' | 'terminé' | null {
  // Si archivé ou terminé manuellement, on ne touche pas
  if (statutActuel === 'archivé' || statutActuel === 'terminé') return null;

  const today = new Date().toISOString().split('T')[0];

  if (!dateDebut) return null;

  if (dateDebut > today) return 'planifié';
  if (dateFin && dateFin < today) return 'terminé';
  return 'en cours';
}
