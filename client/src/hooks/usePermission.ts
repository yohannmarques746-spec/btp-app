import { useMemberSession, type MemberPermissions } from "./useMemberSession";

/**
 * Retourne true si le membre connecté a accès à la feature demandée.
 * Utiliser dans chaque page/composant protégé côté membre.
 */
export function usePermission(feature: keyof MemberPermissions): boolean {
  const { permissions } = useMemberSession();
  return permissions?.[feature] ?? false;
}
