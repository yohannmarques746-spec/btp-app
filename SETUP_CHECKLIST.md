# ✅ CHECKLIST SETUP - État actuel & À faire

---

## 1️⃣ ÉTAT ACTUEL (Migrations déjà appliquées)

### ✅ DÉJÀ EXISTANT

| Migration | Status | Détails |
|-----------|--------|---------|
| `20250322130000_caldy_full_schema.sql` | ✅ Appliquée | Schéma de base (team_members, clients, chantiers, devis, factures) |
| `20260417000000_team_fixes.sql` | ✅ Appliquée | RPC `is_co_owner()`, team_members_history, etc. |
| `20260503000000_new_team_system.sql` | ✅ Appliquée | Colonnes auth_user_id, email, phone + RPCs pour auth email |

### ✅ RPC EXISTANTES

```sql
-- Authentification
✅ login_member_pin()              -- Valide PIN
✅ create_member_session_email()   -- Crée session avec email + PIN optionnel
✅ get_member_session()            -- Récupère session + permissions
✅ is_co_owner()                   -- Vérifie si co-patron

-- Gestion PIN
✅ set_member_pin_self()           -- Employé crée/change son PIN
✅ confirm_team_member()           -- Patron approuve + assigne PIN optionnel
```

### ⚠️ COLONNES TEAM_MEMBERS (vérifier si toutes présentes)

D'après la migration 20260503, ces colonnes doivent exister :

```
✅ id (PK)
✅ user_id (FK → patron)
✅ auth_user_id (FK → Supabase Auth) -- NOUVEAU
✅ name
✅ email -- NOUVEAU
✅ phone -- NOUVEAU
✅ role -- Doit exister (patron/co-patron/employee)
✅ status -- Doit exister (en_attente_confirmation/actif/bloqué/supprimé/refusé)
✅ permissions (JSONB) -- Doit exister
? pin_hash -- OU login_code (à clarifier)
✅ confirmed_at -- NOUVEAU
✅ created_at
✅ updated_at
```

---

## 2️⃣ À VÉRIFIER EN SUPABASE (Critiques)

### Vérification 1 : Colonnes team_members

**Va dans Supabase Dashboard :**
```
Database → Tables → team_members → Structure
```

**Cherche ces colonnes** (doit être toutes présentes) :
- [ ] `id` (uuid, PK)
- [ ] `user_id` (uuid, FK)
- [ ] `auth_user_id` (uuid, FK, nullable) ← Devrait être NOUVEAU après migration 20260503
- [ ] `name` (text)
- [ ] `email` (text) ← Devrait être NOUVEAU
- [ ] `phone` (text) ← Devrait être NOUVEAU
- [ ] `role` (text, default 'employee')
- [ ] `status` (text, default 'en_attente_confirmation')
- [ ] `permissions` (jsonb, default '{}')
- [ ] `pin_hash` (text, nullable, UNIQUE per owner) ← **OU** `login_code` ?
- [ ] `confirmed_at` (timestamptz, nullable) ← Devrait être NOUVEAU
- [ ] `created_at` (timestamptz)
- [ ] `updated_at` (timestamptz)

**Si colonnes manquantes** → Migration pas appliquée (voir point 3)

---

### Vérification 2 : Table audit_logs

**Va dans Supabase Dashboard :**
```
Database → Tables → audit_logs
```

**Doit exister** avec colonnes :
- [ ] `id` (uuid, PK)
- [ ] `owner_id` (uuid, FK → auth.users)
- [ ] `actor_id` (uuid, FK, nullable)
- [ ] `target_member_id` (uuid, FK, nullable)
- [ ] `action` (text)
- [ ] `changes` (jsonb)
- [ ] `ip_address` (text)
- [ ] `created_at` (timestamptz)

**Si manquante** → Migration pas appliquée

---

### Vérification 3 : RPC `is_co_owner`

**Va dans Supabase Dashboard :**
```
Database → Functions → is_co_owner
```

**Doit exister** et retourner BOOLEAN

**Si manquante** → Migration 20260417 pas appliquée

---

## 3️⃣ APPLIQUER LES MIGRATIONS (Si besoin)

### Si colonnes manquent dans team_members

**Copie tout le contenu de** :
```
supabase/migrations/20260503000000_new_team_system.sql
```

**Va dans Supabase Dashboard :**
```
SQL Editor (en bas à gauche)
→ New query
→ Colle le SQL
→ Cmd+Enter (ou Run)
```

**Vérifie** : Pas d'erreurs, colonnes apparaissent

---

### Si RPC `is_co_owner` manque

**Copie juste cette partie de** :
```
supabase/migrations/20260417000000_team_fixes.sql
```

Cherche la section `is_co_owner` et copie-la.

---

## 4️⃣ VÉRIFIER VITE_OWNER_ID

### Qu'est-ce que VITE_OWNER_ID ?

C'est l'**UUID du compte Supabase Auth du patron**. Exemple :
```
VITE_OWNER_ID = "f1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Où la trouver ?

1. **Va dans Supabase Dashboard :**
   ```
   Authentication → Users
   ```

2. **Copie la colonne "User UID" du patron (première ligne)**

3. **Colle dans :**
   ```
   client/.env
   OU
   .env (root)
   ```

   ```env
   VITE_OWNER_ID=f1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

4. **Redémarre** le serveur dev :
   ```bash
   npm run dev
   ```

### Vérifier c'est bien configuré

**Dans l'app**, essaie de te connecter en tant que patron.
- Si ça marche → ✅ VITE_OWNER_ID correct
- Si erreur "Non autorisé" → ❌ VITE_OWNER_ID manquant/incorrect

---

## 5️⃣ VÉRIFIER PIN_HASH vs LOGIN_CODE

### Question : Quel colonne pour le PIN ?

La migration 20260503 utilise **`pin_hash`** (hashé bcrypt).

**Mais la spec dit `login_code`**.

### Clarification

- **Dans la migration SQL** : Colonne s'appelle `pin_hash`
- **Dans la spec** : Peut l'appeler `login_code` ou `pin`
- **L'important** : La colonne doit être HASHÉE en bcrypt, pas plain text

**Action** :
- [ ] Vérifier en Supabase que la colonne s'appelle bien `pin_hash`
- [ ] Si elle s'appelle `login_code`, c'est OK aussi (same thing)
- [ ] Important : **Doit être UNIQUE per owner** (`UNIQUE(user_id, pin_hash)`)

---

## 6️⃣ RÉSUMÉ DES VÉRIFICATIONS

```
AVANT DE LANCER LE PROMPT CURSOR :

[ ] 1. Vérifier all colonnes team_members existent
[ ] 2. Vérifier table audit_logs existe
[ ] 3. Vérifier RPC is_co_owner existe
[ ] 4. Vérifier VITE_OWNER_ID est configuré
[ ] 5. Redémarrer npm run dev
[ ] 6. Tester login en tant que patron → OK

Si tout ✅ :
→ Prêt pour le PROMPT CURSOR
```

---

## 7️⃣ SI PROBLÈME : Réappliquer les migrations

### Scénario 1 : Colonnes team_members manquent

```
1. Copie contenu de 20260503000000_new_team_system.sql
2. Supabase Dashboard → SQL Editor
3. Colle + Run
4. Vérifie : SELECT * FROM team_members LIMIT 1;
5. Doit afficher toutes les colonnes
```

### Scénario 2 : audit_logs manque

```
Même processus, mais juste la partie CREATE TABLE audit_logs
```

### Scénario 3 : Erreur "Column already exists"

```
C'est normal si migration déjà appliquée.
IF NOT EXISTS empêche les erreurs.
Pas de problème.
```

---

## 8️⃣ NEXT STEPS (Si tout ✅)

1. ✅ Vérifications terminées
2. ✅ VITE_OWNER_ID configuré
3. ✅ Migrations appliquées
4. → **Dire "OK, tout prêt" à Claude**
5. → Claude crée le PROMPT CURSOR optimisé
6. → Tu le copies dans Cursor
7. → Cursor code le système d'équipe complet

---

**Status** : 🔍 En attente de vérification en Supabase
