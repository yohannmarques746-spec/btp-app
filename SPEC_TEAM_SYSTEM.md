# SPÉCIFICATION : Système d'Équipe Multi-Tenants avec Gestion d'Accès Granulaire

## 1. CONTEXTE COMMERCIAL

L'application PLANCHAIS sera **vendue à des artisans BTP** (propriétaires/patrons).
Chaque patron a une équipe avec des employés qui ont besoin d'accès différents aux modules.

---

## 2. ACTEURS & RÔLES

### 2.1 Types de comptes

| Acteur | Compte | Authentification | Accès |
|--------|--------|------------------|-------|
| **Patron** | Email + mot de passe Supabase | Supabase Auth (native) | Tous les modules + gestion équipe |
| **Co-patron** | Member PIN (6 chiffres) | PIN login custom | Mêmes droits que Patron + gestion permissions |
| **Employé** | Member PIN (6 chiffres) | PIN login custom | Restreint selon permissions |
| **Client** | Member PIN (6 chiffres) | PIN login custom | Restreint selon permissions |

### 2.2 Permissions par rôle (par défaut)

**Patron (Full Accès)**
- Gère tous les employés (voir, créer, modifier, supprimer)
- Change les PINs
- Assigne/modifie les permissions de TOUS les membres
- Voir les emails de tous les comptes
- Accès complet à tous les modules

**Co-patron**
- Mêmes droits que Patron (peut tout faire)
- Peut gérer autres co-patrons
- Peut assigner/modifier permissions
- Affiche/modifie les PINs

**Employé (par défaut restreint)**
- Par défaut : aucun accès
- Accès activé/bloqué selon permissions

**Client (par défaut restreint)**
- Par défaut : aucun accès
- Accès activé/bloqué selon permissions

---

## 3. FLUX D'ONBOARDING (Adhésion)

### 3.1 Demande d'adhésion

1. Nouvelle personne accède à `/team-members-login`
2. Si PIN inexistant → option **"Demander l'accès"**
3. Remplir form : Nom + Email
4. **Création automatique** d'un compte avec status = `"en_attente_confirmation"`
5. **Email envoyé au Patron** : "Demande d'accès de [Nom] ([Email])"

### 3.2 Confirmation & Accès

1. Patron voit le compte en "En attente de confirmation" dans l'onglet Équipe
2. Patron clique **"Confirmer"** ou **"Refuser"**
3. Si **"Confirmer"** :
   - Status passe à `"actif"`
   - Assigner les permissions (onglets autorisés, modules, etc.)
   - Générer un PIN unique
   - **Email au nouvel utilisateur** : "Accès approuvé. Votre PIN : XXXXXX"
4. Si **"Refuser"** :
   - Status = `"refusé"`
   - Compte reste mais ne peut pas se connecter

---

## 4. ONGLET ÉQUIPE - Interface de Gestion

### 4.1 Vue par statut

**Sous-onglets :**
- 📋 **En attente** (status = en_attente_confirmation)
  - Affiche : Nom, Email, Demande reçue le [date]
  - Actions : [Confirmer] [Refuser]
- ✅ **Actifs** (status = actif)
  - Affiche : Nom, Email, Rôle, PIN (masqué avec option "Afficher")
  - Actions : [Modifier] [Bloquer] [Supprimer]
- ❌ **Bloqués** (status = bloqué)
  - Affiche : Nom, Email, Rôle
  - Actions : [Réactiver] [Supprimer]
- 🚫 **Refusés** (status = refusé)
  - Affiche : Nom, Email
  - Actions : [Réactiver] [Supprimer]

### 4.2 Card/Ligne membre (Actifs)

```
┌─────────────────────────────────────────────────┐
│ Nom : Jean Dupont                               │
│ Email : jean@example.com                        │
│ Rôle : [Dropdown: Patron/Co-patron/Employé/Client]│
│ PIN : ••••••  [Afficher] [Régénérer]           │
│ Status : Actif [Bloquer]                       │
│ Permissions : [Gérer accès →]                  │
└─────────────────────────────────────────────────┘
```

---

## 5. PAGE DE GESTION DES PERMISSIONS

### 5.1 Interface

**Accessible via :** `[Gérer accès]` sur un membre OU nouveau modal/page dédiée

**Affiche tous les onglets/modules de l'app :**
```
┌────────────────────────────────────┐
│ Gestion des accès : Jean Dupont    │
│ Rôle : Employé                     │
├────────────────────────────────────┤
│ □ / ✓  TABLEAUX DE BORD           │
│   ├─ □ / ✓  Voir mon dashboard     │
│   └─ □ / ✓  Voir dashboard équipe  │
│                                    │
│ □ / ✓  CHANTIERS                  │
│   ├─ □ / ✓  Voir mes chantiers     │
│   ├─ □ / ✓  Voir tous chantiers    │
│   ├─ □ / ✓  Créer chantier         │
│   ├─ □ / ✓  Modifier chantier      │
│   └─ □ / ✓  Supprimer chantier     │
│                                    │
│ □ / ✓  DEVIS                       │
│   ├─ □ / ✓  Voir mes devis         │
│   ├─ □ / ✓  Voir tous devis        │
│   ├─ □ / ✓  Créer devis            │
│   ├─ □ / ✓  Modifier devis         │
│   └─ □ / ✓  Supprimer devis        │
│                                    │
│ □ / ✓  FACTURES                    │
│   ├─ □ / ✓  Voir mes factures      │
│   ├─ □ / ✓  Voir toutes factures   │
│   ├─ □ / ✓  Créer facture          │
│   ├─ □ / ✓  Modifier facture       │
│   └─ □ / ✓  Supprimer facture      │
│                                    │
│ □ / ✓  PLANNING                    │
│   ├─ □ / ✓  Voir planning          │
│   └─ □ / ✓  Modifier planning      │
│                                    │
│ □ / ✓  ÉQUIPE                      │
│   ├─ □ / ✓  Voir liste équipe      │
│   └─ □ / ✓  Gérer équipe           │
│                                    │
│ □ / ✓  CLIENTS / CRM               │
│   ├─ □ / ✓  Voir clients           │
│   ├─ □ / ✓  Créer client           │
│   ├─ □ / ✓  Modifier client        │
│   └─ □ / ✓  Supprimer client       │
│                                    │
│ [Enregistrer] [Annuler]            │
└────────────────────────────────────┘
```

### 5.2 Logique

- **Croix rouge (❌)** = Permission refusée
- **Checkmark vert (✅)** = Permission accordée
- **Click** pour basculer
- **[Enregistrer]** applique et recharge l'interface

---

## 6. RESTRICTIONS D'ÉDITION

### 6.1 Qui peut modifier les permissions ?

| Action | Patron | Co-patron | Employé | Client |
|--------|--------|-----------|---------|--------|
| Gérer ses propres perms | ❌ (lui : toujours full) | ❌ (lui : toujours full) | ❌ | ❌ |
| Gérer perms d'autres | ✅ | ✅ | ❌ | ❌ |
| Voir PIN des autres | ✅ (afficher/régénérer) | ✅ | ❌ | ❌ |
| Changer rôle d'un membre | ✅ | ✅ | ❌ | ❌ |
| Bloquer/débloquer | ✅ | ✅ | ❌ | ❌ |
| Supprimer compte | ✅ | ✅ (sauf patron) | ❌ | ❌ |

---

## 7. STRUCTURE BASE DE DONNÉES

### 7.1 Table `team_members` (modifiée)

```sql
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Patron propriétaire
  
  -- Info membre
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  
  -- Authentification
  login_code text NOT NULL UNIQUE,  -- PIN 6 chiffres
  
  -- Rôle & Statut
  role text NOT NULL DEFAULT 'employee',  -- 'patron' | 'co-patron' | 'employee' | 'client'
  status text NOT NULL DEFAULT 'active',  -- 'active' | 'blocked' | 'en_attente_confirmation' | 'refused'
  
  -- Permissions
  permissions jsonb DEFAULT '{}'::jsonb,  -- {"dashboard": {"view_own": true, "view_team": false}, "chantiers": {...}}
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,  -- Quand l'accès a été confirmé
  
  CONSTRAINT unique_email_per_owner UNIQUE(user_id, email)
);
```

### 7.2 Table `permission_templates` (optionnel, pour présets)

```sql
CREATE TABLE permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,  -- "Technicien standard", "Client VIP", etc.
  permissions jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### 7.3 Schéma permissions (jsonb)

```json
{
  "dashboard": {
    "view_own": true,
    "view_team": false
  },
  "chantiers": {
    "view_own": true,
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  "devis": {
    "view_own": true,
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  "factures": {
    "view_own": true,
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  "planning": {
    "view": false,
    "edit": false
  },
  "equipe": {
    "view": false,
    "manage": false
  },
  "clients": {
    "view": false,
    "create": false,
    "edit": false,
    "delete": false
  }
}
```

---

## 8. ENDPOINTS BACKEND À CRÉER/MODIFIER

### 8.1 Équipe (GET/POST/PATCH/DELETE)

```
GET    /api/team/members                    -- Liste membres (patron/co-patron seul)
GET    /api/team/members?status=en_attente  -- Filter par status
POST   /api/team/members/request            -- Nouvelle demande d'adhésion (public)
PATCH  /api/team/members/:id                -- Modifier info (nom, email, rôle, etc.)
PATCH  /api/team/members/:id/pin            -- Régénérer PIN
PATCH  /api/team/members/:id/status         -- Changer status (active/blocked/refused)
PATCH  /api/team/members/:id/permissions    -- Mettre à jour permissions
DELETE /api/team/members/:id                -- Supprimer compte
```

### 8.2 Authentification équipe

```
POST   /api/team/login-pin              -- Login avec PIN (inchangé)
GET    /api/team/session                -- Valider session + retourner permissions
```

### 8.3 Gestion des demandes d'adhésion

```
GET    /api/team/requests                -- Voir demandes (patron/co-patron seul)
POST   /api/team/requests/:id/confirm    -- Confirmer demande
POST   /api/team/requests/:id/refuse     -- Refuser demande
```

---

## 9. FLUX DE VÉRIFICATION À LA CONNEXION

1. **Utilisateur entre PIN** → `/api/team/login-pin`
2. **Backend** :
   - Vérifie PIN existe et appartient au patron
   - Vérifie `status IN ('active', 'en_attente_confirmation')`
   - Si `en_attente_confirmation` → 401 "Compte en attente d'approbation"
   - Si `blocked` ou `refused` → 403 "Accès refusé"
   - Si `active` → génère token de session avec permissions
3. **Frontend** reçoit token + `permissions` object
4. **Contrôle d'accès** : avant d'afficher un module, vérifier `permissions.module.action`

---

## 10. SÉCURITÉ

- **RLS Supabase** : Un patron ne peut voir/modifier que SES membres (WHERE user_id = auth.uid())
- **CSRF** : Tous les POST/PATCH/DELETE protégés
- **PIN** : Jamais exposé au client (stored hash Supabase)
- **Permissions** : Vérifiées côté serveur avant retourner les données
- **Patron/Co-patron** : Encodé dans le token de session, pas modifiable côté client

---

## 11. PAGES FRONTEND À MODIFIER/CRÉER

| Page | Action |
|------|--------|
| `TeamMemberLogin.tsx` | Ajouter option "Demander l'accès" |
| `TeamPage.tsx` | Interface complète d'équipe (vue par statut) |
| `TeamAccessControl.tsx` | **[NOUVEAU]** Page gestion permissions (checkboxes) |
| `Dashboard.tsx` | Vérifier permissions avant afficher modules |
| Tous les modules | Vérifier `session.permissions` avant afficher |

---

## 12. EXEMPLE SCÉNARIO COMPLET

### Jour 1 : Artisan crée compte
- Jean (patron) crée compte PLANCHAIS avec email + mot de passe
- Son user_id = `abc-123`

### Jour 2 : Employé demande accès
- Pierre (employé) va sur `/team-members-login`
- Clique "Demander l'accès"
- Remplit : Nom = "Pierre Dupont", Email = "pierre@gmail.com"
- Backend crée entry dans `team_members` :
  ```
  id: xyz-789
  user_id: abc-123 (Jean)
  name: Pierre Dupont
  email: pierre@gmail.com
  role: employee
  status: en_attente_confirmation
  login_code: 123456 (généré)
  permissions: {} (vide)
  ```
- Email reçu par Jean : "Pierre Dupont demande l'accès"

### Jour 3 : Patron approuve
- Jean se connecte en tant que patron
- Onglet Équipe → "En attente" → voit Pierre
- Clique [Confirmer]
- Interface gestion permissions s'ouvre
- Jean active : "Voir mes chantiers", "Voir planning"
- Clique [Enregistrer]
- `team_members.status` → `active`
- `team_members.confirmed_at` → now()
- Email à Pierre : "Accès approuvé. PIN : 123456. Bienvenue !"

### Jour 4 : Pierre se connecte
- Pierre va `/team-members-login`
- Rentre PIN `123456`
- Backend valide, retourne token avec permissions
- Pierre accède au dashboard, voit que "Chantiers" + "Planning"
- Les autres modules (Devis, Factures, etc.) sont grisés/cachés

### Jour 5 : Jean change les permissions
- Jean change les perms de Pierre : ajoute "Voir tous les chantiers"
- Pierre rafraîchit → voit TOUS les chantiers

---

## 13. REMARQUES IMPORTANTES

- **Email unique par patron** : Un email ne peut être associé qu'une fois par patron (UNIQUE constraint)
- **PIN unique globalement** : Pas deux membres avec le même PIN (UNIQUE)
- **Patron toujours full accès** : Sa ligne dans `team_members` (si elle existe) doit avoir `role = 'patron'` et permissions complètes
- **Co-patron exception** : Peut modifier permissions comme un patron
- **Statut "en_attente_confirmation" autrefois "blocked"** : Permet de distinguer "en attente" vs "bloqué volontairement"

---

**Prêt à créer le prompt Cursor ?**
