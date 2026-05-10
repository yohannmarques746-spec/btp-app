# Prompt Cursor — Écran employé avec sidebar filtrée par permissions

> **À copier-coller dans Cursor (mode Agent).**
> Objectif : faire que l'écran employé (`/team-members-dash`) ait la MÊME apparence visuelle que le dashboard patron (header + sidebar + content area) MAIS avec la sidebar filtrée selon les permissions du membre.

---

<CONTEXTE>
Application : **PLANCHAIS** — SaaS de gestion BTP.

Architecture actuelle :
- **Dashboard patron** : routes `/dashboard/*` (Dashboard, QuotesPage, ProspectsPage, ProjectsPage, ClientsPage, PlanningPage, CRMPipelinePage, TeamPage, PaymentsPage, SettingsPage). Toutes derrière `<ProtectedRoute>`. Layout : `<Sidebar>` à gauche + content à droite, géré par `PageWrapper`.
- **Sidebar patron** : `client/src/components/Sidebar.tsx` — itère sur un array d'items avec `<Link href={item.path}>` (wouter routing).
- **Écran employé actuel** : route `/team-members-dash` rend `TeamMemberDashboard.tsx` (410 lignes) — un layout custom standalone qui affiche les chantiers assignés + notes. PAS de sidebar, PAS de structure dashboard patron.

Session employé :
- Hook `useMemberSession()` (`client/src/hooks/useMemberSession.ts`) — récupère `{ memberId, name, permissions: MemberPermissions, ownerId, assignedChantiers }` depuis `/api/team/session` avec le token `localStorage.getItem("member-session-token")`.
- `MemberPermissions` = `{ crm, planning, devis, factures, chantiers, clients, dashboard }` (booléens).

Spec attendue (SPEC_INTEGRATED_FINAL.md §3.6) :
> L'employé connecté voit un dashboard avec la même structure visuelle que le patron, mais la sidebar n'affiche QUE les modules pour lesquels `permissions.X = true`.

Cas concret : si l'employé a `{ chantiers: true, planning: true, clients: true }`, sa sidebar affiche uniquement ces 3 items + "Mon profil équipe".
</CONTEXTE>

<OBJECTIF>
Restructurer la page `/team-members-dash` pour qu'elle utilise la même architecture visuelle que le dashboard patron (Sidebar + Header + content) AVEC une sidebar filtrée par `member.permissions`. L'employé doit pouvoir naviguer entre les modules autorisés (chantiers, planning, clients, devis, factures, crm, dashboard) et voir le contenu de chaque module limité à ce qu'il est autorisé à voir.
</OBJECTIF>

<CONTRAINTES>
- **TypeScript strict** : pas de `any`, props typées
- **React 18 + Wouter** pour le routing
- **Tailwind + Radix UI** pour le style (réutiliser les composants existants de `client/src/components/ui/`)
- **Pas de duplication** : réutiliser au maximum les composants existants (Sidebar, MobileHeader, GlobalBackground)
- **Préserver le PageWrapper** existant pour la cohérence visuelle
- **Garder l'auth membre** : le token vit dans `localStorage.getItem("member-session-token")`, vérifié via `useMemberSession()`. Aucun changement à l'auth.
- **Pas de modification des routes patron** : `/dashboard/*` reste pour le patron. L'employé navigue sur `/team-members-dash/*`.
- **Pas de fetch direct Supabase** depuis les pages employé pour les data métier (devis/factures/clients). Tout passe par des endpoints serveur qui appliquent les permissions (à créer dans `api/team-router.ts` plus tard si besoin).
- **Sidebar filtering** : utiliser `member.permissions` du hook `useMemberSession`. Items dont la permission est `false` ne s'affichent PAS du tout (pas grisé).
</CONTRAINTES>

<EXAMPLES>

**Exemple — Sidebar avec filtre permissions :**

```tsx
// client/src/components/EmployeeSidebar.tsx
import { Link, useLocation } from "wouter";
import { Home, Building2, Calendar, Users, FileText, Receipt, Workflow, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberPermissions } from "@/hooks/useMemberSession";

interface SidebarItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permissionKey: keyof MemberPermissions;
}

const ITEMS: SidebarItem[] = [
  { path: "/team-members-dash",           label: "Vue d'ensemble",  icon: <Home className="w-5 h-5" />,       permissionKey: "dashboard" },
  { path: "/team-members-dash/chantiers", label: "Mes chantiers",   icon: <Building2 className="w-5 h-5" />,  permissionKey: "chantiers" },
  { path: "/team-members-dash/planning",  label: "Planning",        icon: <Calendar className="w-5 h-5" />,   permissionKey: "planning" },
  { path: "/team-members-dash/clients",   label: "Clients",         icon: <Users className="w-5 h-5" />,      permissionKey: "clients" },
  { path: "/team-members-dash/devis",     label: "Devis",           icon: <FileText className="w-5 h-5" />,   permissionKey: "devis" },
  { path: "/team-members-dash/factures",  label: "Factures",        icon: <Receipt className="w-5 h-5" />,    permissionKey: "factures" },
  { path: "/team-members-dash/crm",       label: "CRM",             icon: <Workflow className="w-5 h-5" />,   permissionKey: "crm" },
];

export function EmployeeSidebar({ permissions }: { permissions: MemberPermissions }) {
  const [location] = useLocation();
  const visibleItems = ITEMS.filter((it) => permissions[it.permissionKey]);

  return (
    <aside className="w-64 bg-black/30 backdrop-blur-xl border-r border-white/10 flex flex-col">
      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map((it) => {
          const isActive = location === it.path;
          return (
            <Link key={it.path} href={it.path}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
                isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
              )}>
                {it.icon}<span>{it.label}</span>
              </a>
            </Link>
          );
        })}
        <div className="border-t border-white/10 my-2 pt-2">
          <Link href="/team-members-dash/profile">
            <a className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-white/5">
              <User className="w-5 h-5" /><span>Mon profil équipe</span>
            </a>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
```

**Anti-modèle (❌ à éviter) :**

```tsx
// ❌ Ne PAS hardcoder les items ou afficher des grisés inutiles
const items = [/* ... */];
return items.map(it => (
  <a className={!permissions[it.key] ? "opacity-50 pointer-events-none" : ""}>...</a>
));
// L'utilisateur a demandé "afficher uniquement les modules permis" — pas en grisé.
```
</EXAMPLES>

<IMPLEMENTATION>

### Étape 1 : ANALYSE
- Lire `client/src/components/Sidebar.tsx` (sidebar patron) pour comprendre la structure visuelle exacte
- Lire `client/src/components/PageWrapper.tsx`
- Lire `client/src/hooks/useMemberSession.ts`
- Lire `client/src/pages/TeamMemberDashboard.tsx` (l'écran actuel à remplacer)
- Lire `client/src/App.tsx` pour comprendre le routing wouter

### Étape 2 : CRÉER `EmployeeSidebar.tsx`
Fichier : `client/src/components/EmployeeSidebar.tsx`
- Composant exactement comme l'example ci-dessus
- Filtre les items via `permissions[item.permissionKey]`
- Garde toujours visible "Mon profil équipe"

### Étape 3 : CRÉER `EmployeeLayout.tsx`
Fichier : `client/src/components/EmployeeLayout.tsx`
- Wrapper qui reproduit la structure visuelle du PageWrapper patron : `<GlobalBackground />` + `<EmployeeSidebar permissions={...} />` + `<main>{children}</main>`
- Utilise `useMemberSession()` pour récupérer les permissions et le `member.name`
- Si `member === null && !isLoading` → redirect vers `/team-members-login` (déjà géré par le hook)
- Affiche un header simple avec le nom du membre + bouton "Déconnexion" (qui supprime `localStorage["member-session-token"]` + redirige vers `/team-members-login`)

### Étape 4 : SPLITTER `TeamMemberDashboard.tsx` en pages par module
- `client/src/pages/employee/EmployeeOverview.tsx` — la vue actuelle "chantiers assignés + notes" (extraite du fichier actuel)
- `client/src/pages/employee/EmployeeChantiers.tsx` — la liste détaillée des chantiers (pour l'instant : copie de la vue overview filtrée sur les chantiers du membre)
- `client/src/pages/employee/EmployeePlanning.tsx` — placeholder "Planning à venir" avec une callout
- `client/src/pages/employee/EmployeeClients.tsx` — placeholder
- `client/src/pages/employee/EmployeeDevis.tsx` — placeholder
- `client/src/pages/employee/EmployeeFactures.tsx` — placeholder
- `client/src/pages/employee/EmployeeCrm.tsx` — placeholder
- `client/src/pages/employee/EmployeeProfile.tsx` — affiche `member.name`, `member.email` (à récupérer côté API si besoin), permissions, bouton "Créer mon PIN" si pas encore défini

Chaque page est wrappée par `<EmployeeLayout>`.

### Étape 5 : MODIFIER `App.tsx` pour les nouvelles routes
Remplacer le case `"/team-members-dash"` actuel par un guard qui matche `/team-members-dash` ET `/team-members-dash/...` :

```tsx
if (location === "/team-members-dash" || location === "/team-members-dash/") {
  return <EmployeeLayout><EmployeeOverview /></EmployeeLayout>;
}
if (location.startsWith("/team-members-dash/")) {
  const sub = location.slice("/team-members-dash/".length);
  // Mapper sub → composant
  // Vérifier la permission côté client (UX, sécurité serveur séparée)
  if (sub === "chantiers")  return <EmployeeLayout><EmployeeChantiers /></EmployeeLayout>;
  if (sub === "planning")   return <EmployeeLayout><EmployeePlanning /></EmployeeLayout>;
  if (sub === "clients")    return <EmployeeLayout><EmployeeClients /></EmployeeLayout>;
  if (sub === "devis")      return <EmployeeLayout><EmployeeDevis /></EmployeeLayout>;
  if (sub === "factures")   return <EmployeeLayout><EmployeeFactures /></EmployeeLayout>;
  if (sub === "crm")        return <EmployeeLayout><EmployeeCrm /></EmployeeLayout>;
  if (sub === "profile")    return <EmployeeLayout><EmployeeProfile /></EmployeeLayout>;
  return <NotFound />;
}
```

Le fichier `client/src/pages/TeamMemberDashboard.tsx` peut être supprimé après extraction de son contenu vers `EmployeeOverview.tsx`.

### Étape 6 : VALIDATION
- `npm run check` : 0 erreur
- `npm run build` : passe
- Login en tant qu'employé avec permissions limitées → vérifier que la sidebar ne montre que les modules permis
- Tester chaque lien → arrive sur la bonne page
- Logout fonctionne

</IMPLEMENTATION>

<CHECKPOINTS>

🔴 **CHECKPOINT 1** — Après création de `EmployeeSidebar.tsx` et `EmployeeLayout.tsx`
- Visuellement identiques à la sidebar patron (mêmes couleurs, espacements, hover)
- `npm run check` passe

🔴 **CHECKPOINT 2** — Après création des 7 pages employé
- Chaque page est un export default React component
- Les placeholders ont un texte explicite ("Module Devis — bientôt disponible")
- `npm run check` passe

🔴 **CHECKPOINT 3** — Après modification de `App.tsx`
- `npm run build` passe sans warning
- Routing : `/team-members-dash/chantiers` rend `EmployeeChantiers`
- Routing : `/team-members-dash/planning` rend `EmployeePlanning`
- Etc.

🔴 **CHECKPOINT 4** — Test E2E manuel
- Patron crée un membre avec permissions `{ chantiers: true, planning: true }` uniquement
- Membre se connecte → voit sidebar avec **uniquement** "Vue d'ensemble", "Mes chantiers", "Planning" + "Mon profil équipe"
- Membre clique "Planning" → arrive sur EmployeePlanning sans 404

</CHECKPOINTS>

<PIEGES>
- ❌ Ne PAS dupliquer le Sidebar patron — créer EmployeeSidebar dédié qui prend `permissions` en prop
- ❌ Ne PAS utiliser `<ProtectedRoute>` (c'est pour le patron Supabase auth, pas les membres équipe)
- ❌ Ne PAS appeler Supabase directement depuis les pages employé pour les data métier (RLS bloque) — passer par `/api/team/*` qui sera étendu plus tard
- ⚠️ Le `useMemberSession()` redirige déjà vers `/team-members-login` si pas de token. Pas besoin de re-checker dans chaque page.
- ⚠️ Le bouton "Déconnexion" supprime UNIQUEMENT `localStorage["member-session-token"]` — PAS la session Supabase (qui n'existe pas pour les membres)
- ⚠️ Si l'URL `/team-members-dash/devis` est tapée directement mais que l'employé n'a pas la permission, le composant doit afficher un "Accès refusé" plutôt que de rendre la page. Ajouter un guard client dans EmployeeLayout :
  ```tsx
  const requiredPermission = pathToPermissionMap[location];
  if (requiredPermission && !permissions[requiredPermission]) {
    return <AccessDenied />;
  }
  ```
</PIEGES>

<COMPATIBILITE>
- Vercel : aucun changement de config
- Supabase : aucune migration nouvelle nécessaire
- GitHub : branch from main → PR
</COMPATIBILITE>

<FORMAT_SORTIE>
- TypeScript strict, functional React components
- Named exports pour les composants utility
- Default export pour les pages
- Imports : `@/` pour `client/src/`, relatifs sinon
- Pas de commentaires JSDoc verbeux
</FORMAT_SORTIE>

<DONE_CRITERIA>
- [ ] `client/src/components/EmployeeSidebar.tsx` créé, prend `permissions: MemberPermissions` en prop, filtre les items
- [ ] `client/src/components/EmployeeLayout.tsx` créé, encapsule la structure visuelle
- [ ] 8 fichiers dans `client/src/pages/employee/` : Overview, Chantiers, Planning, Clients, Devis, Factures, Crm, Profile
- [ ] `client/src/App.tsx` modifié pour router toutes les `/team-members-dash/*`
- [ ] `client/src/pages/TeamMemberDashboard.tsx` supprimé (son contenu déplacé dans EmployeeOverview)
- [ ] `npm run check` : 0 erreur TypeScript
- [ ] `npm run build` : passe
- [ ] Sidebar employé visuellement identique à la sidebar patron
- [ ] Filtre permissions fonctionne (modules masqués si permission=false)
- [ ] Commit Conventional : `feat(employee): refactor dashboard with permission-filtered sidebar`
</DONE_CRITERIA>
