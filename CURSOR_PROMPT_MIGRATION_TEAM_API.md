# Prompt Cursor — Migration `/api/team/*` Express → Vercel serverless

> **À copier-coller dans Cursor (mode Agent recommandé).**
> Ce prompt migre 20 endpoints Express vers 16 fonctions serverless Vercel pour que la page Équipe (TeamPage.tsx, TeamPermissionsPage.tsx) fonctionne en production. Le code Express existant dans `server/routes/authTeam.ts` reste la source de vérité — Cursor doit le porter 1:1, pas le réinventer.

---

<CONTEXTE>
Application : **PLANCHAIS** — SaaS de gestion pour PME du BTP suisses (devis, chantiers, factures, planning, équipe).

Stack :
- **Frontend** : React 18 + TypeScript strict + Vite + Tailwind + Radix UI + Framer Motion + React Query
- **Backend** : Express en dev local (`npm run dev`, port 3002) — **NE TOURNE PAS sur Vercel en prod**
- **Backend prod** : Vercel serverless functions (dossier `api/`)
- **DB** : Supabase Postgres + Auth (project ref `uowsssvaobrpdpnhxgwc`)
- **Routing** : Wouter
- **Hébergement** : Vercel (`btp-app-theta.vercel.app`)

État actuel — bug à corriger :
- `server/routes/authTeam.ts` (973 lignes) implémente 20 endpoints `/api/team/*` complets : CSRF, rate-limit, login PIN, gestion membres, co-owners, permissions, audit
- `server/routes/auth.ts` (35 lignes après refactor) → endpoint `/api/auth/resolve-session`
- **Tous ces endpoints fonctionnent en local** parce qu'Express tourne
- **Aucun ne fonctionne en prod** parce que Vercel ne déploie que les fichiers du dossier `api/`
- Seul `api/auth/resolve-session.ts` existe côté Vercel (déjà migré, utilise `shared/auth/resolveSession.ts`)
- Conséquence : page Équipe charge mais TOUS les boutons (Confirmer, Refuser, Bloquer, Régénérer PIN, etc.) retournent 404 silencieux

Décisions architecturales déjà prises (à respecter, ne pas reconsidérer) :
1. **PIN bcrypt** (`team_members.pin_hash`) — JAMAIS afficher le PIN, uniquement régénérer + envoyer par email
2. **Co-patron** stocké dans `public.app_co_owners` — JAMAIS dans `team_members.role`
3. **Endpoint login** = `/api/auth/resolve-session` (existe déjà, ne pas dupliquer avec `/api/auth/login-with-pin`)
4. **Insert `team_members`** au signup = logique applicative dans `AuthContext.signUp()` (PAS de trigger SQL)
5. **CSRF** = Origin/Referer check + token HMAC stateless (pas de session-bound)
6. **Rate-limit** = en mémoire par instance Vercel (acceptable pour le V1, REDIS_URL en option pour l'avenir)
7. Tout le code partagé entre Express dev et Vercel prod vit dans `shared/auth/` ou `shared/team/`

Fichiers de référence (source de vérité — porter 1:1, pas réinventer) :
- `server/routes/authTeam.ts` → contient toute la logique des 20 endpoints
- `server/routes/auth.ts` + `api/auth/resolve-session.ts` → pattern de migration déjà appliqué
- `server/middleware/csrf.ts` → logique CSRF HMAC stateless (déjà serverless-friendly, juste à extraire)
- `server/middleware/rateLimit.ts` → logique rate-limit en mémoire
- `shared/auth/resolveSession.ts` → exemple de module partagé Express + Vercel
- `supabase/migrations/20260417000000_team_fixes.sql` → table `app_co_owners` + RPC `is_co_owner`
- `supabase/migrations/20260503000000_new_team_system.sql` → RPCs `confirm_team_member`, `create_member_session_email`, `set_member_pin_self`
</CONTEXTE>

<OBJECTIF>
Migrer les 20 endpoints Express définis dans `server/routes/authTeam.ts` vers 16 fichiers serverless Vercel sous `api/team/`, en factorisant la logique partagée dans `shared/team/` et `shared/auth/middleware.ts`. Le code Express continue de marcher en dev (`npm run dev`) en réutilisant les mêmes modules partagés. Aucune régression fonctionnelle. Aucun changement de schéma DB. Le client (`TeamPage.tsx`, `TeamPermissionsPage.tsx`, `LoginPage.tsx`) ne change pas — il appelle déjà ces routes.
</OBJECTIF>

<CONTRAINTES>
- **TypeScript strict** : pas de `any`, pas de `@ts-ignore`. Toutes les fonctions ont leurs types explicites.
- **Vercel serverless** : chaque fichier sous `api/team/**.ts` exporte un `default async function handler(req, res)` typé `IncomingMessage` / `ServerResponse` (pas `Express.Request/Response` — c'est l'erreur classique).
- **Imports** : utiliser `@shared/...` côté `server/` et chemins **relatifs** côté `api/` (`../../shared/...`) — Vercel ne respecte pas toujours les paths tsconfig pour le bundler serverless.
- **Pas de `process.env.X` côté client** — tout est runtime serveur.
- **Préserver les noms d'endpoints existants** (le client appelle déjà `/api/team/login-pin`, `/api/team/members`, etc.) — ne PAS renommer.
- **CSRF** : le check ne doit **pas** dépendre d'une session Express. Le module CSRF actuel utilise déjà du HMAC stateless — l'extraire tel quel.
- **Rate-limit** : Map en mémoire. Sur Vercel chaque cold start = reset, c'est OK pour V1.
- **Logs serverless** : `console.error("[api/team/...] msg", err)` — pattern Vercel.
- **Réponses JSON** : toujours `Content-Type: application/json`, `JSON.stringify(body)`.
- **CORS** : headers `Access-Control-Allow-Origin: *` + handle `OPTIONS` (comme dans `api/auth/resolve-session.ts`).
- **Body parsing** : Vercel ne parse PAS le body automatiquement pour `IncomingMessage` — utiliser le helper `readBody()` (à mettre dans `shared/auth/serverlessHelpers.ts`).
- **Routes dynamiques Vercel** : `[id]` dans le nom de fichier = paramètre. Ex: `api/team/members/[id]/confirm.ts` → `req.url` ou parsing de l'URL pour récupérer l'id (Vercel injecte `req.query` mais avec `IncomingMessage` brut on doit parser à la main, OU utiliser le typage `@vercel/node` `VercelRequest` qui expose `req.query`).
- **Décision** : utiliser `import type { VercelRequest, VercelResponse } from "@vercel/node"` partout côté `api/team/`. Plus ergonomique que `IncomingMessage/ServerResponse`. Vérifier que `@vercel/node` est dans `package.json` (sinon l'ajouter en `devDependencies`).
- **Ne pas casser l'existant** : `server/routes/authTeam.ts` reste utilisé par Express en dev. Il doit lui aussi être refactorisé pour appeler les modules `shared/team/*` et NE plus contenir la logique métier (juste le routing Express + appels aux helpers).
</CONTRAINTES>

<EXAMPLES>

**Exemple — Pattern de fichier serverless (✅ correct) :**

```typescript
// api/team/members/[id]/confirm.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { confirmTeamMember } from "../../../../shared/team/confirmMember";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const { ownerId, role, pin } = req.body as { ownerId?: string; role?: string; pin?: string };

  if (!ownerId || !role) {
    res.status(400).json({ error: "ownerId et role requis" });
    return;
  }

  const allowed = await requireOwnerOrCoOwner(auth.user.id, ownerId, res);
  if (!allowed) return;

  const result = await confirmTeamMember({
    memberId: id,
    ownerId,
    role,
    pin: pin ?? null,
  });

  res.status(result.status).json(result.body);
}
```

**Anti-modèle (❌ à éviter) :**

```typescript
// ❌ Mauvais : utilise les types Express, pas de CORS, pas de typage du body
import { Router, Request, Response } from "express";
const router = Router();

router.post("/members/:id/confirm", async (req: Request, res: Response) => {
  const { ownerId, role, pin } = req.body;
  // ... duplique la logique au lieu d'appeler shared/team/confirmMember
  await supabaseServer.rpc("confirm_team_member", { ... });
  res.json({ ok: true });
});

export default router;
// Vercel ne sait pas quoi faire d'un Router Express
```

**Exemple — Module partagé (✅ correct) :**

```typescript
// shared/team/confirmMember.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../auth/supabaseFactory";

export interface ConfirmInput {
  memberId: string;
  ownerId: string;
  role: string;
  pin: string | null;
}

const PIN_RE = /^\d{6}$/;

export async function confirmTeamMember(input: ConfirmInput): Promise<{ status: number; body: object }> {
  if (input.pin && !PIN_RE.test(input.pin)) {
    return { status: 400, body: { error: "Le PIN doit être 6 chiffres" } };
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase.rpc("confirm_team_member", {
    p_member_id: input.memberId,
    p_owner_id: input.ownerId,
    p_role: input.role,
    p_pin: input.pin,
  });

  if (error) {
    if (error.message?.includes("PIN_DUPLICATE")) {
      return { status: 409, body: { error: "Ce PIN est déjà utilisé par un autre membre" } };
    }
    console.error("[confirmTeamMember] RPC error:", error);
    return { status: 500, body: { error: "Erreur serveur" } };
  }

  return { status: 200, body: { ok: true } };
}
```

</EXAMPLES>

<IMPLEMENTATION>

### Étape 1 : ANALYSE

Lire intégralement et comprendre :
- `server/routes/authTeam.ts` (logique des 20 endpoints)
- `server/middleware/csrf.ts` (génération + verify HMAC)
- `server/middleware/rateLimit.ts` (Map in-memory)
- `shared/auth/resolveSession.ts` + `api/auth/resolve-session.ts` (le pattern à suivre)
- `client/src/pages/TeamPage.tsx` (vérifier les noms exacts des routes appelées par fetch())
- `client/src/lib/csrf.ts` (le client lit le token via `getCsrfToken()`)

Vérifier que `@vercel/node` est dans `package.json`. Sinon : `npm install --save-dev @vercel/node`.

### Étape 2 : CRÉER LES MODULES PARTAGÉS

#### 2.1 `[NOUVEAU]` `shared/auth/supabaseFactory.ts`
Singleton lazy du client Supabase serveur. Évite de re-créer un client à chaque cold start.

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    throw new Error("[supabaseFactory] SUPABASE_URL ou SUPABASE_ANON_KEY manquant");
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}
```

#### 2.2 `[NOUVEAU]` `shared/auth/serverlessHelpers.ts`
Helpers réutilisés par TOUS les fichiers `api/team/`.

Fonctions exportées :
- `withCors(req, res): boolean` → set CORS headers, return true si OPTIONS (caller doit return)
- `withMethod(req, res, method | method[]): boolean` → 405 si méthode invalide
- `extractBearer(req): string | null`
- `readJsonBody(req): Promise<unknown>` (Vercel parse `req.body` quand `Content-Type: application/json`, mais ce helper assure un fallback robuste)
- `getClientIp(req): string` (parse `x-forwarded-for`)

#### 2.3 `[NOUVEAU]` `shared/auth/middleware.ts`
Helpers d'autorisation, retournent `null` ou un objet, et écrivent la réponse d'erreur si bloqué.

- `requireAuth(req, res): Promise<{ user: User } | null>` → 401 si pas de Bearer ou token invalide
- `requireOwnerOrCoOwner(userId, ownerId, res): Promise<boolean>` → 403 si pas owner/co-owner
- `requireMemberSession(req, res): Promise<{ memberId, ownerId } | null>` → vérifie token member via RPC `get_member_session`

#### 2.4 `[NOUVEAU]` `shared/auth/csrf.ts`
Copier le contenu de `server/middleware/csrf.ts` MAIS sans dépendre d'Express. Exporter :
- `generateCsrfToken(): string`
- `verifyCsrfToken(token: string): boolean`
- `requireCsrf(req, res): boolean` (true si OK, sinon écrit 403 et return false)

Le `requireCsrf` lit `req.headers["x-csrf-token"]`. À appeler dans tous les fichiers POST/PATCH/DELETE.

#### 2.5 `[NOUVEAU]` `shared/auth/rateLimit.ts`
Copier `server/middleware/rateLimit.ts` MAIS sans Express. Exporter :
- `checkAndIncrementLimit(key: string): { allowed, remaining, resetAt }`
- `requireRateLimit(req, res, key): boolean` (true si autorisé, sinon écrit 429)

#### 2.6 `[NOUVEAU]` `shared/team/*` — un fichier par "domaine logique"

Fichiers à créer (chacun exporte des fonctions pures qui retournent `{ status, body }`) :
- `shared/team/auth.ts` → `loginPin`, `loginInvite`, `logout`, `getSession`
- `shared/team/members.ts` → `listMembers`, `getMember`, `createMember`, `updateMemberPin`, `confirmMember`, `refuseMember`, `updatePermissions`, `updateStatus`, `deleteMember`, `setOwnPin`
- `shared/team/notes.ts` → `listNotes`, `createNote`
- `shared/team/coOwners.ts` → `listCoOwners`, `addCoOwner`, `removeCoOwner`

**Source de vérité** : le code dans `server/routes/authTeam.ts`. Porter 1:1 chaque handler dans la bonne fonction de `shared/team/*`.

### Étape 3 : CRÉER LES 16 SERVERLESS FUNCTIONS

Structure du dossier `api/team/` :

```
api/team/
├── csrf-token.ts                    # GET /api/team/csrf-token
├── login-pin.ts                     # POST /api/team/login-pin (alias /login)
├── login-invite.ts                  # POST /api/team/login-invite
├── logout.ts                        # POST /api/team/logout
├── me.ts                            # GET /api/team/me (alias /session)
├── notes.ts                         # GET + POST /api/team/notes
├── co-owners/
│   ├── index.ts                     # GET + POST /api/team/co-owners
│   └── [userId].ts                  # DELETE /api/team/co-owners/:userId
└── members/
    ├── index.ts                     # GET + POST /api/team/members
    ├── me/
    │   └── set-pin.ts               # POST /api/team/members/me/set-pin
    └── [id]/
        ├── index.ts                 # GET + DELETE /api/team/members/:id
        ├── confirm.ts               # POST .../confirm
        ├── refuse.ts                # POST .../refuse
        ├── pin.ts                   # PATCH .../pin
        ├── permissions.ts           # PATCH .../permissions
        └── status.ts                # PATCH .../status
```

Chaque fichier suit le pattern de `<EXAMPLES>` ci-dessus :
1. CORS preflight
2. Method check
3. Auth (CSRF si mutation, rate-limit si login)
4. Permissions (owner/co-owner)
5. Appel à la fonction `shared/team/*` correspondante
6. Réponse JSON

### Étape 4 : REFACTORISER `server/routes/authTeam.ts`

`server/routes/authTeam.ts` doit être réduit à ~150 lignes max : juste le routing Express qui appelle les fonctions `shared/team/*`, pas la logique métier.

Pattern :

```typescript
router.post("/members/:id/confirm", async (req, res) => {
  const user = await getSupabaseUserExpress(req); // helper Express qui wrap requireAuth
  if (!user) return res.status(401).json({ error: "Non autorisé" });

  const { ownerId, role, pin } = req.body;
  if (!ownerId || !role) return res.status(400).json({ error: "ownerId et role requis" });

  const allowed = await isOwnerOrCoOwner(user.id, ownerId);
  if (!allowed) return res.status(403).json({ error: "Accès refusé" });

  const result = await confirmTeamMember({ memberId: req.params.id, ownerId, role, pin: pin ?? null });
  res.status(result.status).json(result.body);
});
```

Les middlewares `csrfMiddleware` et `rateLimitLoginMember` continuent de fonctionner via leurs versions Express qui wrappent `requireCsrf` / `requireRateLimit`.

### Étape 5 : VALIDATION

- `npm run check` : 0 erreur TypeScript
- `npm run build` : passe sans erreur
- `npm run dev` : Express tourne, login PIN local marche
- Pas de fichier dupliqué : la logique vit dans `shared/`, pas dans `server/routes/` ni `api/`

</IMPLEMENTATION>

<CHECKPOINTS>

🔴 **CHECKPOINT 1 — Après création des modules `shared/`**
- `npx tsc --noEmit` : 0 erreur
- Pas d'import circulaire entre `shared/auth/` et `shared/team/`
- `shared/auth/supabaseFactory.ts` exporte bien un singleton

🔴 **CHECKPOINT 2 — Après les 16 serverless functions**
- `ls -R api/team/` correspond exactement à l'arborescence ci-dessus
- Chaque fichier exporte un `default async function handler(req: VercelRequest, res: VercelResponse)`
- `npm run check` : 0 erreur (vu que `tsconfig.json` inclut `api/**/*`)

🔴 **CHECKPOINT 3 — Après refactor `server/routes/authTeam.ts`**
- Le fichier fait moins de 200 lignes
- Chaque handler Express délègue à `shared/team/*`
- `npm run dev` démarre sans erreur, l'endpoint `GET /api/team/csrf-token` répond en local

🔴 **CHECKPOINT 4 — Build prod**
- `npm run build` passe
- Le bundle Vite est généré dans `dist/public/`
- `dist/index.js` (server bundle) existe

🔴 **CHECKPOINT 5 — Smoke test après push**
- Vercel déploie en READY
- `curl -X POST https://btp-app-theta.vercel.app/api/team/csrf-token` retourne `{"token": "..."}`
- Dans la TeamPage en prod, ouvrir DevTools → cliquer "Confirmer et configurer" sur un membre en attente → la requête `POST /api/team/members/:id/confirm` retourne 200, pas 404

</CHECKPOINTS>

<PIEGES>

**Vercel serverless spécifique :**
- ❌ Ne PAS importer Express dans les fichiers `api/` (échec build)
- ❌ Ne PAS utiliser `req.params` (Express only) — c'est `req.query` avec `VercelRequest`
- ❌ Ne PAS `require()` — Vercel utilise ESM par défaut (vu `"type": "module"` dans `package.json`)
- ❌ Ne PAS lire `req.body` sans vérifier — Vercel le parse pour `application/json` mais peut être `undefined` si méthode GET
- ⚠️ Routes dynamiques : le fichier `[id]/confirm.ts` reçoit `req.query.id` (string ou string[]). Toujours `as string`.
- ⚠️ Cold start : éviter les imports lourds en top-level. `getSupabaseServer()` est lazy.

**Supabase :**
- ⚠️ Le service_role key n'est PAS utilisé ici — tout passe par anon key + RPC SECURITY DEFINER
- ⚠️ Quand on appelle `supabase.auth.getUser(token)` côté server, le token vient du Bearer header — pas d'auto-detect

**TypeScript :**
- ❌ Pas de `as any` pour contourner un type — utiliser un type guard ou un cast typé
- ⚠️ Les RPC retournent souvent `T | T[]` — utiliser `unwrapRpc<T>()` (à mettre dans `shared/auth/serverlessHelpers.ts`)

**CSRF :**
- ⚠️ Le client appelle `GET /api/team/csrf-token` puis envoie `X-CSRF-Token` dans le header des mutations. Vérifier que `client/src/lib/csrf.ts` ne change pas.
- ⚠️ Sur Vercel, chaque cold start n'invalide PAS les tokens (HMAC stateless — c'est volontaire)

**Rate-limit :**
- ⚠️ Map in-memory = chaque instance Vercel a la sienne. Si tu veux du global, il faut Redis (variable `REDIS_URL` déjà dans `.env`, à brancher plus tard)
- ⚠️ Limiter l'usage du rate-limit aux endpoints de login (`/login-pin`, `/login-invite`) — pas sur les requêtes data normales

**Préservation de l'existant :**
- ❌ Ne PAS renommer un endpoint (le client a des fetch() hardcodés)
- ❌ Ne PAS modifier `client/src/pages/TeamPage.tsx` ni `LoginPage.tsx` ni `TeamPermissionsPage.tsx`
- ❌ Ne PAS modifier les RPC Supabase ni le schéma DB
- ❌ Ne PAS toucher `api/auth/resolve-session.ts` (déjà migré)

</PIEGES>

<COMPATIBILITE>

**Vercel** :
- [ ] `vercel.json` rewrite `/api/(.*)` → `/api/$1` est déjà OK (vérifier qu'il n'a pas régressé)
- [ ] Variables d'env existantes dans dashboard : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OWNER_IDS` (suffisant)
- [ ] Pas besoin d'ajouter de nouvelle variable d'env pour cette migration
- [ ] `CSRF_SECRET` à ajouter dans le dashboard Vercel (sinon fallback dev — pas grave en V1, à ajouter plus tard)

**Supabase** :
- [ ] Aucune migration SQL nouvelle — tous les RPC nécessaires existent déjà
- [ ] RLS déjà en place (vérifier qu'on ne touche pas aux policies)

**GitHub** :
- [ ] Branch depuis `main` → PR avec description claire
- [ ] Diff doit comprendre : nouveaux fichiers `api/team/`, nouveaux fichiers `shared/auth/`, nouveaux fichiers `shared/team/`, refactor `server/routes/authTeam.ts`
- [ ] AUCUN fichier `.env` ou clé hardcodée dans le diff

**TypeScript** :
- [ ] `tsconfig.json` inclut déjà `api/**/*` (vérifié)
- [ ] `npm run check` doit passer

</COMPATIBILITE>

<FORMAT_SORTIE>

- **Langage** : TypeScript strict
- **Module system** : ESM (`import`/`export`)
- **Style** :
  - Composants React : functional, named export, props interface séparée — N/A ici (pas de UI)
  - Fonctions serverless : `export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>`
  - Fonctions partagées : nommées, retournent `{ status: number; body: object }`
- **Conventions** :
  - PascalCase pour types/interfaces
  - camelCase pour fonctions et variables
  - Imports relatifs côté `api/`, alias `@shared/` côté `server/`
- **Logs** :
  - `console.error("[shared/team/confirmMember] RPC error:", error)` pour les erreurs
  - Pas de `console.log` de débogage dans le code livré

**À NE PAS produire** :
- Pas de fichier README explicatif
- Pas de commentaires JSDoc verbeux (un commentaire d'en-tête par fichier suffit)
- Pas de modification du frontend
- Pas de modification du schéma SQL ni des migrations

</FORMAT_SORTIE>

<DONE_CRITERIA>

- [ ] Les 16 fichiers serverless existent dans `api/team/` selon l'arborescence spécifiée
- [ ] Les modules partagés existent dans `shared/auth/` et `shared/team/`
- [ ] `server/routes/authTeam.ts` est refactorisé (~150 lignes max), sans logique métier dupliquée
- [ ] `npm run check` : 0 erreur TypeScript
- [ ] `npm run build` : passe sans erreur ni warning bloquant
- [ ] `npm run dev` démarre, le login PIN local fonctionne
- [ ] Aucun fichier `.env` ou clé hardcodée dans le diff
- [ ] Aucun fichier client (`client/src/**`) modifié
- [ ] Aucune migration SQL ajoutée
- [ ] Le commit suit le format Conventional Commits :
      `feat(api): migrer les endpoints /api/team/* en Vercel serverless functions`
- [ ] Une fois pushé : Vercel build READY + `curl POST /api/team/csrf-token` retourne 200 + un test de login PIN dans la TeamPage déclenche bien une requête POST 200 (pas 404)

</DONE_CRITERIA>
