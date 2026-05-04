/**
 * Utilitaire pour gérer les propriétaires (owners) de l'application
 * Supporte plusieurs propriétaires avec accès complet
 */

const OWNER_IDS = import.meta.env.VITE_OWNER_IDS as string | undefined;

export const OWNERS_LIST = OWNER_IDS?.split(',').map((id) => id.trim()).filter(Boolean) || [];

/**
 * Vérifie si un utilisateur est propriétaire (owner) de l'application
 * @param userId - UUID de l'utilisateur à vérifier
 * @returns true si l'utilisateur est propriétaire
 */
export function isOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return OWNERS_LIST.includes(userId);
}

/**
 * Obtient la liste de tous les propriétaires
 */
export function getOwnersList(): string[] {
  return [...OWNERS_LIST];
}

/**
 * Vérifie si la liste des propriétaires est configurée correctement
 */
export function isOwnersConfigured(): boolean {
  return OWNERS_LIST.length > 0;
}
