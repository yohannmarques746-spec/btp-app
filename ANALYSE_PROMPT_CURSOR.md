# ANALYSE DU PROMPT CURSOR - Bugs & Améliorations

---

## 🐛 BUGS IDENTIFIÉS

### BUG 1 : Flux d'authentification confus

**Problème** :
Le prompt mélange 2 flows différents :
- Créer un compte (email + password Supabase Auth)
- Demander l'accès (crée team_members entry)

**Impact** : 
- Pas clair QUAND l'employé voit "En attente de confirmation"
- Pas clair quand team_members est créée

**Solution** :
```
Créer compte (Supabase Auth) → Status team_members = en_attente_confirmation
↓
Patron approuve → Status = actif
↓
Employé peut se connecter avec email + password + PIN optionnel
```

---

### BUG 2 : PIN au login - logique ambiguë

**Problème** :
Le prompt dit "PIN optionnel" mais le endpoint `/api/team/login-pin` vérifie SEULEMENT le PIN.

**Code actuel** (dans le prompt) :
```typescript
// ligne ~82-89
const res = await fetch("/api/team/login-pin", {
  method: "POST",
  body: JSON.stringify({ pin: pin.join(""), ownerId: OWNER_ID })
})
```

C'est un endpoint PIN-ONLY, pas email+password+PIN.

**Solution** :
Créer un endpoint AUTH combiné :
```typescript
POST /api/auth/login-with-pin {
  email: "pierre@gmail.com",
  password: "password",
  pin?: "123456"  // optionnel
}
```

---

### BUG 3 : Status "en_attente_confirmation" - Backend bloqué au login

**Problème** :
Le prompt dit que l'employé en attente voit un message "En attente", mais le flow dit aussi qu'il se connecte avec email + password.

**Contradiction** :
- Si Supabase Auth réussit (email + password valides) → token JWT créé
- Mais status = en_attente_confirmation
- Frontend doit bloquer l'accès APRÈS Supabase Auth réussit

**Solution** :
```typescript
// Après Supabase Auth OK
const { data: member } = await supabase
  .from('team_members')
  .select('status')
  .eq('auth_user_id', user.id)
  .single()

if (member.status === 'en_attente_confirmation') {
  // Afficher écran "En attente"
  // Pas d'accès dashboard
}
```

---

### BUG 4 : Soft-delete pas implémenté

**Problème** :
Le prompt crée un endpoint `DELETE /api/team/members/:id` qui supprime vraiment.

**Manque** :
- `PATCH /api/team/members/:id` pour soft-delete (status = supprimé)
- Dialog "Supprimer aussi les données ?"
- Hard-delete endpoint séparé

**Solution** :
```
[Supprimer] → PATCH status = 'supprimé' (soft delete)
[Supprimer définitivement] (dans onglet Supprimés) → DELETE + dialog
```

---

### BUG 5 : Employé peut se mettre un PIN - pas dans le prompt

**Problème** :
Le prompt NE gère pas le fait que l'employé peut créer son propre PIN.

**Manque d'endpoints** :
```
POST   /api/team/members/me/set-pin     -- Employé crée son PIN
PATCH  /api/team/members/me/pin         -- Employé change son PIN
GET    /api/team/members/me             -- Employé voit son profil
```

**Impact** :
- Impossible pour l'employé de se mettre un PIN
- Pas de vue "Mon profil" pour employé

---

### BUG 6 : Visibilité Co-patron - pas correcte

**Problème** :
Le prompt dit co-patron "peut gérer equipe" mais ne précise pas qu'il NE PEUT PAS modifier les co-patrons.

**Manque de logique** :
```
Si co-patron essaie de modifier un autre co-patron
→ 403 FORBIDDEN (pas autorisé)

Si patron essaie de modifier un co-patron
→ 200 OK (autorisé)
```

**Solution** :
Backend doit checker :
```typescript
if (memberToUpdate.role === 'co-patron' && userRole === 'co-patron') {
  return res.status(403).json({ error: 'Non autorisé' })
}
```

---

### BUG 7 : Email optionnel - pas clarifié

**Problème** :
Le prompt dit "Email optionnel" mais :
- Email est OBLIGATOIRE pour créer un compte (Supabase Auth)
- Email est unique UNIQUE constraint dans team_members

**Risque** :
- Deux employés avec le même email ? Pas possible (Supabase Auth unique)
- Mais UNIQUE constraint par owner dans team_members est OK

**Solution** :
Clarifier : Email est OBLIGATOIRE (créé à l'inscription Supabase), pas optionnel.

---

### BUG 8 : RLS Policies - Co-patron vs Employé

**Problème** :
Le prompt mentionne RLS pour patron, mais pas clair pour co-patron.

**Manque** :
```sql
-- Co-patron ne peut modifier que employés
CREATE POLICY "team_members_co_patron_update"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (role = 'employee')  -- Co-patron voit seulement employés
  )
```

---

### BUG 9 : Hash du PIN

**Problème** :
Le prompt ne précise pas si le PIN doit être hashé ou en plain text.

**Recommandation** :
- PIN DOIT être hashé en base de données (bcrypt)
- Mais pour un PIN 6 chiffres, c'est pas critical (pas de brute force simple)
- Mais TOUJOURS hasher par sécurité

---

### BUG 10 : Session token - quoi inclure ?

**Problème** :
Le prompt dit "créer session avec { memberId, role, permissions }" mais pas clair si c'est :
- JWT Supabase ?
- Token custom serveur ?
- localStorage ?

**Manque** :
Clarifier la session pour employé :
```javascript
{
  userId: "auth.user.id",           // Supabase Auth
  memberId: "team_members.id",      // ID dans team_members
  role: "employee",                 // patron/co-patron/employee
  permissions: {...},               // jsonb décodé
  email: "pierre@gmail.com"
}
```

---

## ✅ AMÉLIORATIONS RECOMMANDÉES

### AMÉLIORATION 1 : Endpoints plus clairs

**Avant** :
```
POST   /api/team/login-pin              -- Ambiguë
PATCH  /api/team/members/:id/status     -- OK
PATCH  /api/team/members/:id/permissions -- OK
```

**Après** :
```
POST   /api/auth/login-with-pin         -- Email + password + PIN optionnel
POST   /api/team/members/:id/confirm    -- Approuver demande en attente
POST   /api/team/members/me/set-pin     -- Employé crée son PIN
PATCH  /api/team/members/me/pin         -- Employé change son PIN
GET    /api/team/members/me             -- Employé voit son profil
PATCH  /api/team/members/:id/status     -- Changer status (actif/bloqué)
PATCH  /api/team/members/:id            -- Soft delete (status = supprimé)
DELETE /api/team/members/:id            -- Hard delete avec dialog
```

---

### AMÉLIORATION 2 : Validation PIN au login

**Ajouter** :
```typescript
// Endpoint login combiné
POST /api/auth/login-with-pin {
  email: string,
  password: string,
  pin?: string
}

// Backend logic:
1. Valide email + password avec Supabase Auth
2. Récupère team_members pour cet email
3. Si status = "en_attente_confirmation" → 401 "En attente d'approbation"
4. Si status = "bloqué" → 403 "Accès refusé"
5. Si PIN défini dans team_members.login_code:
   - Si PIN fourni → Valide PIN
   - Si PIN pas fourni → 401 "PIN requis"
6. Si PIN pas défini:
   - PIN fourni → Ignore (optionnel)
   - PIN pas fourni → OK
7. Retourner session token avec permissions
```

---

### AMÉLIORATION 3 : Composant "Mon profil" pour employé

**Nouveau** :
```typescript
// client/src/components/MyTeamProfile.tsx
export function MyTeamProfile() {
  const { user } = useAuth()
  const { profile, loading, updatePin } = useMyTeamProfile(user.id)
  
  return (
    <div>
      <h2>Mon profil équipe</h2>
      <p>Nom: {profile.name}</p>
      <p>Email: {profile.email}</p>
      <p>Rôle: {profile.role}</p>
      
      {profile.login_code ? (
        <div>
          <p>PIN: ••••••</p>
          <button onClick={() => updatePin(generateNewPin())}>Changer PIN</button>
        </div>
      ) : (
        <button onClick={() => updatePin(generateNewPin())}>Créer mon PIN</button>
      )}
      
      <p>Permissions: {JSON.stringify(profile.permissions)}</p>
    </div>
  )
}
```

---

### AMÉLIORATION 4 : Dialog soft-delete vs hard-delete

**Nouveau** :
```typescript
// Option 1: Soft delete (vrai action)
[Supprimer] → PATCH /api/team/members/:id/status {status: 'supprimé'}
// Membre invisible dans "Actifs"

// Option 2: Hard delete (dans onglet "Supprimés")
[Supprimer définitivement] → Dialog "Vraiment supprimer ?"
Dialog: "Supprimer aussi toutes les données créées ?"
  - [Non, garder les données]
  - [Oui, tout supprimer]
DELETE /api/team/members/:id (détruit team_members entry)
```

---

### AMÉLIORATION 5 : RLS Policies pour Co-patron

**Ajouter SQL** :
```sql
-- Co-patron ne peut voir que employés
DROP POLICY IF EXISTS "team_members_co_patron_select" ON public.team_members;
CREATE POLICY "team_members_co_patron_select"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    -- Soit c'est le patron de ce member
    user_id = auth.uid()
    -- Soit c'est un co-patron du patron de ce member
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = team_members.user_id
        AND tm.auth_user_id = auth.uid()
        AND tm.role = 'co-patron'
        AND team_members.role = 'employee'
    )
  )
);
```

---

### AMÉLIORATION 6 : Clarifier structure team_members

**Ajouter colonne** :
```sql
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
```

Pourquoi ? Pour lier la row team_members à l'utilisateur Supabase Auth qui s'est créé un compte.

**Index** :
```sql
CREATE INDEX idx_team_members_auth_user_id ON public.team_members(auth_user_id);
```

---

### AMÉLIORATION 7 : Email d'approbation - template clair

**Template email** :
```
Sujet : Votre accès à PLANCHAIS a été approuvé

Bonjour Pierre,

Votre demande d'accès à PLANCHAIS a été approuvée par votre patron.

Voici vos informations de connexion :
- Email : pierre@gmail.com
- Mot de passe : [celui que vous avez créé]
- Code PIN (optionnel) : Vous pouvez en créer un dans la section "Mon profil" de l'application

Vous pouvez maintenant accéder à l'application à l'adresse :
https://app.planchais.ch

Bienvenue ! 🚀

-- L'équipe PLANCHAIS
```

---

### AMÉLIORATION 8 : Typage strict des permissions

**Créer type** :
```typescript
type PermissionKey = 
  | 'dashboard.view_own'
  | 'dashboard.view_team'
  | 'chantiers.view_own'
  | 'chantiers.view_all'
  // ... etc

type Permissions = Record<PermissionKey, boolean>
```

**Éviter** :
```typescript
permissions: Record<string, any>  // Trop générique
```

---

### AMÉLIORATION 9 : Validator pour PIN

**Ajouter utility** :
```typescript
// server/utils/pinValidator.ts
export function validatePin(pin: string): boolean {
  // PIN must be 6 digits
  return /^\d{6}$/.test(pin)
}

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function hashPin(pin: string): string {
  // Use bcrypt, not plain text
  return bcrypt.hashSync(pin, 10)
}
```

---

### AMÉLIORATION 10 : Audit logging (optionnel v2)

**Recommandé** :
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,  -- 'member_approved', 'permission_changed', 'member_blocked'
  actor_id uuid REFERENCES auth.users(id),
  target_member_id uuid REFERENCES team_members(id),
  owner_id uuid REFERENCES auth.users(id),
  changes jsonb,  -- Avant/après
  created_at timestamptz DEFAULT now()
);
```

Permet de tracker qui a changé quoi et quand.

---

## 📋 CHECKLIST : Avant de lancer le prompt final

- [ ] Clarifier endpoint login (email + password + PIN optionnel)
- [ ] Ajouter endpoints pour employé (my-profile, set-pin, change-pin)
- [ ] Bien séparer soft-delete vs hard-delete
- [ ] RLS policies pour co-patron (ne voir que employés)
- [ ] Ajouter colonne auth_user_id dans team_members
- [ ] Type system strict pour permissions
- [ ] Email templates claires
- [ ] Hash du PIN (bcrypt)
- [ ] Gestion "En attente" → bloqué au login
- [ ] Dialog "Supprimer les données ?"

---

## 🎯 CONCLUSION

**Le prompt initial est une bonne base MAIS**:
1. Mélange 2 flows différents (signup vs login team)
2. PIN non clairement optionnel/obligatoire
3. Manque endpoints employé (set-pin, my-profile)
4. Soft-delete pas implémenté
5. Co-patron restrictions manquantes
6. Session management ambiguë

**Après les améliorations** : Prompt est prêt ! 🚀
