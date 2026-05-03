# SPÉCIFICATION INTÉGRÉE FINALE - Système d'Équipe PLANCHAIS

**Status** : ✅ Approuvée - Prête pour prompt Cursor

---

## 1. VUE D'ENSEMBLE

### 1.1 Rôles (3 seulement)

```
PATRON
├─ Email + Mot de passe (Supabase Auth)
├─ Full accès + gestion équipe + modifier co-patrons & employés
└─ Peut assigner PIN obligatoire ou optionnel

CO-PATRON
├─ Email + Mot de passe (Supabase Auth)
├─ Full accès à tout
├─ NE peut modifier QUE les employés (pas co-patrons/patrons)
└─ Peut assigner PIN obligatoire ou optionnel

EMPLOYÉ
├─ Email + Mot de passe (Supabase Auth) - créé à l'inscription
├─ PIN optionnel (peut le définir lui-même après confirmation)
├─ Accès selon permissions patron
└─ Voit son profil dans "Mon profil équipe"
```

---

## 2. FLUX COMPLET (SANS CONFUSION)

### 2.1 Jour 1 : Employé crée son compte

```
Employé va sur /signup
├─ Email: pierre@gmail.com
├─ Mot de passe: ••••••
└─ ✅ Crée dans Supabase Auth

Email de confirmation Supabase reçu
└─ ✅ Confirme email

Supabase Auth crée aussi automatiquement:
└─ Entry dans team_members avec:
   ├─ auth_user_id = UUID Supabase Auth
   ├─ user_id = patron UUID (si employee_code donné, ou NULL si signup libre)
   ├─ email = pierre@gmail.com
   ├─ name = vide (à remplir plus tard)
   ├─ login_code = NULL (pas de PIN)
   ├─ role = NULL (pas assigné)
   ├─ status = 'en_attente_confirmation'
   └─ permissions = {} (vide)
```

### 2.2 Jour 1bis : Employé essaie de se connecter

```
Employé va sur /login
├─ Email: pierre@gmail.com
├─ Mot de passe: ••••••
├─ PIN: [vide]
└─ Clique "Se connecter"

Backend:
├─ ✅ Valide email + password avec Supabase Auth
├─ ✅ Récupère team_members pour cet email
├─ ❌ Vérifie status = 'en_attente_confirmation'
└─ 401 Response: "Votre demande d'accès est en attente d'approbation"

Frontend affiche:
┌──────────────────────────────────┐
│ ⏳ DEMANDE EN ATTENTE             │
│                                  │
│ Nom : Pierre Dupont              │
│ Email : pierre@gmail.com         │
│ Demande reçue le : 2026-05-03    │
│ à 14:30                          │
│                                  │
│ Veuillez attendre l'approbation  │
│ du patron pour accéder.          │
│                                  │
│ [Retour à la connexion]          │
└──────────────────────────────────┘
```

### 2.3 Jour 2 : Patron approuve & assigne PIN

Patron voit dans Équipe → "En attente" :

```
Pierre Dupont (pierre@gmail.com)
Demande reçue le : 2026-05-03 14:30

[Confirmer et configurer] [Refuser]
```

Patron clique **[Confirmer et configurer]** → Modal :

```
┌─────────────────────────────────────┐
│ Configuration: Pierre Dupont        │
├─────────────────────────────────────┤
│                                     │
│ Rôle: [Dropdown: Employé / Co-pat] │
│                                     │
│ Code PIN personnel (optionnel):     │
│ ☐ Sans PIN (vide = pas requis)      │
│   ├─ Login : email + password seul  │
│   └─ Employé peut s'en créer un    │
│                                     │
│ OU                                  │
│                                     │
│ ☑ Avec PIN obligatoire:            │
│   ├─ [Entrer PIN: 123456]           │
│   ├─ OU [Générer auto: 654321]      │
│   └─ Login : email + password + PIN │
│                                     │
│ Permissions: [Lien → page perms]   │
│                                     │
│ [Suivant] [Annuler]                │
└─────────────────────────────────────┘
```

**Cas A : Patron laisse PIN vide**

```
└─ login_code = NULL
└─ Email à Pierre:
   "Votre accès a été approuvé !
    Pour vous connecter: Email + Mot de passe
    (Vous pouvez ajouter un PIN optionnel dans 'Mon profil')"
```

**Cas B : Patron entre/génère PIN**

```
└─ login_code = "654321" (hashé bcrypt)
└─ Email à Pierre:
   "Votre accès a été approuvé !
    Pour vous connecter: Email + Mot de passe + PIN
    PIN: 654321"
```

Patron clique [Suivant] → Page permissions → checkboxes → [Enregistrer]

```
Backend MAJ team_members:
├─ status = 'actif'
├─ confirmed_at = now()
├─ role = 'employee'
├─ login_code = NULL ou "bcrypt(654321)"
└─ permissions = {...}
```

### 2.4 Jour 3 : Employé se connecte

**Formulaire login** :

```
Email: [pierre@gmail.com]
Mot de passe: [••••••]
Code PIN (optionnel): []    ← VIDE si patron n'a pas assigné PIN

[Se connecter]
```

**Backend validation** :

```
1. ✅ Valide email + password (Supabase Auth)
2. ✅ Récupère team_members
3. ✅ Vérifie status = 'actif'
4. ✅ Si login_code est NULL:
   └─ PIN fourni = IGNORÉ (optionnel)
5. ✅ Si login_code est défini:
   └─ Si PIN fourni → valide PIN
   └─ Si PIN absent → 401 "PIN requis"
6. ✅ Crée session: { userId, memberId, role, permissions }
7. ✅ Connecté !
```

### 2.5 Jour 5 : Employé veut créer son PIN (optionnel)

Employé va dans **"Mon profil équipe"** :

```
┌─────────────────────────────────────┐
│ MON PROFIL ÉQUIPE                   │
├─────────────────────────────────────┤
│ Nom: Pierre Dupont                  │
│ Email: pierre@gmail.com             │
│ Rôle: Employé                       │
│ Statut: Actif ✓                     │
│                                     │
│ PIN personnel: [Aucun]              │
│ [Créer mon PIN]                     │
│                                     │
│ Permissions: [Voir détails]         │
└─────────────────────────────────────┘
```

Clique **[Créer mon PIN]** :

```
┌─────────────────────────────────────┐
│ Créer mon PIN                       │
├─────────────────────────────────────┤
│                                     │
│ Entre ton PIN (6 chiffres):         │
│ [123456]                            │
│                                     │
│ [Créer] [Annuler]                  │
└─────────────────────────────────────┘
```

Backend :

```
POST /api/team/members/me/set-pin {
  pin: "123456"
}

❌ Erreur possible: PIN déjà utilisé par un autre membre
✅ Success: login_code updaté + hashé
```

À partir de là, employé DOIT rentrer son PIN au login.

---

## 3. ONGLET ÉQUIPE - Interface Patron & Co-patron

### 3.1 Navigation (4 onglets)

```
[En attente (3)] [Actifs (15)] [Bloqués (2)] [Supprimés (1)]
```

### 3.2 Onglet "En attente"

```
Pierre Dupont (pierre@gmail.com)
Demande reçue: 2026-05-03 14:30

[Confirmer et configurer] [Refuser]

└─ Refuser → status = 'refusé' + email au demandeur
```

### 3.3 Onglet "Actifs"

```
┌─────────────────────────────────────────┐
│ Jean Dupont - Employé - Actif ✓         │
│ jean@gmail.com                          │
│                                         │
│ PIN: Défini ✓ [Afficher] [Régénérer]   │
│ Permissions: 5/18                       │
│                                         │
│ [Gérer permissions] [Bloquer] [Supprimer]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Sophie Martin - Employé - Actif ✓       │
│ sophie@gmail.com                        │
│                                         │
│ PIN: Pas défini [Assigner PIN]          │
│ Permissions: 3/18                       │
│                                         │
│ [Gérer permissions] [Bloquer] [Supprimer]
└─────────────────────────────────────────┘
```

**Actions** :
- **[Gérer permissions]** → Page checkboxes
- **[Afficher PIN]** → Affiche le PIN maskqué
- **[Régénérer PIN]** → Nouveau PIN + email
- **[Assigner PIN]** → Modal pour ajouter un PIN
- **[Bloquer]** → status = 'bloqué'
- **[Supprimer]** → status = 'supprimé' (soft delete)

### 3.4 Onglet "Bloqués"

```
Grisé, même layout
[Réactiver] [Supprimer]
```

### 3.5 Onglet "Supprimés/Archivés"

```
Grisé/italics
[Restaurer] [Supprimer définitivement]
```

**[Supprimer définitivement]** → Dialog :

```
┌──────────────────────────────────────┐
│ ⚠️ SUPPRIMER COMPLÈTEMENT             │
│                                      │
│ Pierre Dupont                        │
│                                      │
│ Voulez-vous aussi supprimer TOUTES  │
│ les données créées par Pierre ?      │
│                                      │
│ ☐ Non, garder les données           │
│   (Chantiers restent, auteur = NULL)│
│                                      │
│ ☑ Oui, tout supprimer               │
│   (Pierre et toutes ses données)    │
│                                      │
│ [Confirmer suppression]              │
│ [Annuler]                            │
└──────────────────────────────────────┘
```

### 3.6 Vue Employé : "Mon profil équipe"

Employé voit SON profil seulement :

```
┌─────────────────────────────────────┐
│ MON PROFIL ÉQUIPE                   │
├─────────────────────────────────────┤
│ Nom: Pierre Dupont                  │
│ Email: pierre@gmail.com             │
│ Rôle: Employé                       │
│ Statut: Actif ✓                     │
│                                     │
│ PIN personnel:                      │
│ ☐ Aucun [Créer mon PIN]             │
│ ☑ Défini [Afficher] [Changer]       │
│                                     │
│ Mes permissions:                    │
│ • Chantiers (mes chantiers)         │
│ • Planning (voir)                   │
│                                     │
│ (Lecture seule - contact patron)   │
└─────────────────────────────────────┘
```

---

## 4. PAGE GESTION PERMISSIONS

### 4.1 Interface (ID: /team-permissions/:memberId)

**Haut de page** :
```
Gestion des permissions : Pierre Dupont
Rôle: Employé | Email: pierre@gmail.com
```

**Contenu** :
```
☑ TABLEAUX DE BORD
  ├─ ☑ Voir mon dashboard
  └─ ☐ Voir dashboard équipe

☑ CHANTIERS
  ├─ ☑ Voir mes chantiers
  ├─ ☐ Voir tous les chantiers
  ├─ ☐ Créer
  ├─ ☐ Modifier
  └─ ☐ Supprimer

☑ DEVIS
  ├─ ☑ Voir mes devis
  ├─ ☐ Voir tous les devis
  ├─ ☐ Créer
  ├─ ☐ Modifier
  └─ ☐ Supprimer

☑ FACTURES
  ├─ ☐ Voir mes factures
  ├─ ☐ Voir toutes les factures
  ├─ ☐ Créer
  ├─ ☐ Modifier
  └─ ☐ Supprimer

☐ PLANNING
  ├─ ☐ Voir planning
  └─ ☐ Modifier planning

☐ ÉQUIPE
  ├─ ☐ Voir liste équipe
  └─ ☐ Gérer équipe

☐ CLIENTS / CRM
  ├─ ☐ Voir clients
  ├─ ☐ Créer
  ├─ ☐ Modifier
  └─ ☐ Supprimer

[Enregistrer] [Annuler]
```

**Logique** :
- Parent unchecked → Enfants grisés/disabled
- Parent checked → Enfants modifiables
- [Enregistrer] → PATCH /api/team/members/:id/permissions

---

## 5. RESTRICTIONS STRICTES

### 5.1 Qui peut modifier qui ?

| Action | Patron | Co-patron | Employé |
|--------|--------|-----------|---------|
| Voir liste équipe | ✅ (tous) | ✅ (employés seul) | ❌ |
| Ouvrir profil employé | ✅ | ✅ | ❌ |
| Ouvrir profil co-patron | ✅ | ❌ | ❌ |
| Ouvrir profil patron | ✅ | ❌ | ❌ |
| Assigner PIN | ✅ | ✅ (employés seul) | ❌ |
| Modifier permissions | ✅ | ✅ (employés seul) | ❌ |
| Changer rôle | ✅ | ❌ | ❌ |
| Bloquer/débloquer | ✅ | ✅ (employés seul) | ❌ |
| Supprimer | ✅ | ✅ (employés seul) | ❌ |

**⚠️ CRITIQUE** : Si co-patron essaie d'accéder profile d'un co-patron/patron → 403 FORBIDDEN

---

## 6. BASE DE DONNÉES

### 6.1 Table team_members

```sql
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Liens
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Info
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  
  -- Auth PIN
  login_code text UNIQUE,  -- ← NULLABLE (optionnel)
                           -- ← HASHÉ bcrypt si défini
  
  -- Rôle & Status
  role text NOT NULL DEFAULT 'employee',  -- 'patron' | 'co-patron' | 'employee'
  status text NOT NULL DEFAULT 'en_attente_confirmation',
  -- 'en_attente_confirmation' | 'actif' | 'bloqué' | 'supprimé' | 'refusé'
  
  -- Permissions
  permissions jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  
  -- Constraints
  CONSTRAINT unique_email_per_owner UNIQUE(user_id, email),
  CONSTRAINT unique_pin_per_owner UNIQUE(user_id, login_code)
  -- ↑ login_code peut être NULL (plusieurs membersans PIN OK)
);

CREATE INDEX idx_team_members_auth_user_id ON public.team_members(auth_user_id);
CREATE INDEX idx_team_members_status ON public.team_members(user_id, status);
```

### 6.2 Table audit_logs (v2)

```sql
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  actor_id uuid REFERENCES auth.users(id),  -- Qui a fait l'action
  target_member_id uuid REFERENCES public.team_members(id),
  action text NOT NULL,  -- 'member_approved', 'permission_changed', 'member_blocked'
  changes jsonb,  -- Avant/après
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_owner ON public.audit_logs(owner_id, created_at DESC);
```

---

## 7. ENDPOINTS (COMPLET)

### Auth

```
POST   /api/auth/login-with-pin
  ├─ Body: { email, password, pin? }
  ├─ Retour: { token, memberId, role, permissions, status }
  └─ Error 401/403 si en_attente/bloqué/PIN manquant
```

### Équipe - Employé voit son profil

```
GET    /api/team/members/me
  ├─ Retour: mon profil (read-only)
  └─ Status: mon status, permissions

POST   /api/team/members/me/set-pin
  ├─ Body: { pin: "123456" }
  ├─ Hash bcrypt + store
  └─ Error 409 si PIN déjà utilisé

PATCH  /api/team/members/me/pin
  ├─ Body: { oldPin, newPin }
  └─ Valide oldPin, store newPin hashé
```

### Équipe - Patron/Co-patron gère employés

```
GET    /api/team/members?status=en_attente|actif|bloque|supprime
  ├─ Co-patron: voir que employés
  └─ Patron: voir tous

GET    /api/team/members/:id
  ├─ Co-patron: 403 si co-patron/patron
  └─ Patron: OK

POST   /api/team/members/:id/confirm
  ├─ Body: { role, pin?, permissions }
  ├─ status = 'actif'
  ├─ Send email
  └─ Log audit

POST   /api/team/members/:id/refuse
  ├─ status = 'refusé'
  └─ Send email

PATCH  /api/team/members/:id/pin
  ├─ Body: { pin? }
  ├─ NULL ou hashé
  └─ Send email si change

PATCH  /api/team/members/:id/permissions
  ├─ Body: { permissions }
  └─ MAJ jsonb

PATCH  /api/team/members/:id/status
  ├─ Body: { status: 'bloqué'|'actif'|'supprimé' }
  └─ Soft delete = status = 'supprimé'

DELETE /api/team/members/:id
  ├─ Hard delete + dialog
  ├─ Body: { deleteData: true|false }
  └─ Si true: supprimer toutes les données du membre
```

---

## 8. SÉCURITÉ

✅ **RLS Policies**
```sql
-- Patron voit ses membres
WHERE user_id = auth.uid()

-- Co-patron voit employés seulement
WHERE user_id = (SELECT user_id FROM team_members WHERE auth_user_id = auth.uid())
  AND role = 'employee'
```

✅ **PIN Hashing** : bcrypt (10 rounds)

✅ **CSRF** : Tous POST/PATCH/DELETE

✅ **Double Auth** : Email/Password + PIN optionnel (défense en profondeur)

✅ **Audit Logging** : Action, actor, changes, timestamp

✅ **Session Token** : Non modifiable client

---

## 9. PERMISSIONS PAR DÉFAUT

### Employé NEW

```json
{
  "dashboard": {
    "view_own": true,      ← Par défaut
    "view_team": false
  },
  "chantiers": {
    "view_own": true,      ← Par défaut
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  "devis": {
    "view_own": false,     ← Bloqué par défaut
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  // ... rest false
}
```

**Patron peut cocher/décocher chaque permission**

---

## 10. FLUX D'ERREUR

### Erreur 1 : PIN déjà utilisé

```
POST /api/team/members/:id/pin {pin: "123456"}
Response 409 Conflict: "Ce PIN est déjà utilisé par un autre employé"
```

### Erreur 2 : Co-patron essaie modifier co-patron

```
PATCH /api/team/members/id-autre-co-patron {...}
Response 403 Forbidden: "Vous ne pouvez modifier que les employés"
```

### Erreur 3 : Login sans PIN requis

```
POST /api/auth/login-with-pin {
  email: "pierre@gmail.com",
  password: "...",
  pin: ""  ← vide
}
Response 401: "PIN requis pour ce compte"
```

---

## 11. EXEMPLE DE SESSION TOKEN

```javascript
{
  userId: "abc-123",                    // Supabase Auth
  memberId: "xyz-789",                  // team_members.id
  email: "pierre@gmail.com",
  name: "Pierre Dupont",
  role: "employee",
  status: "actif",
  permissions: {
    dashboard: { view_own: true, view_team: false },
    chantiers: { view_own: true, view_all: false, create: false, ... },
    // ...
  }
}
```

---

## 12. VÉRIFICATION D'ACCÈS (Guard)

### Frontend

```typescript
// Avant afficher un module:
if (!session.permissions?.chantiers?.view_all && !session.permissions?.chantiers?.view_own) {
  return <AccessDenied />
}
```

### Backend

```typescript
// Avant retourner des données:
if (!permissions.chantiers.view_all && !permissions.chantiers.view_own) {
  return res.status(403).json({ error: 'Accès refusé' })
}
```

---

**✅ SPÉCIFICATION COMPLÈTE, SANS AMBIGUÏTÉ, PRÊTE POUR CURSOR**
