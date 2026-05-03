# SPÉCIFICATION FINALE : Système d'Équipe avec Gestion d'Accès

---

## 1. RÔLES (3 seulement)

| Rôle | Authentification | Droits |
|------|------------------|--------|
| **Patron** | Email + Mot de passe (Supabase Auth) | Full accès à tout + gestion équipe complète + modifier co-patrons |
| **Co-patron** | Email + Mot de passe (Supabase Auth) + PIN optionnel | Full accès à tout + gestion équipe + modifier permissions des employés SEULEMENT (pas les co-patrons) |
| **Employé** | Email + Mot de passe (Supabase Auth) + PIN obligatoire | Accès restreint selon permissions assignées par patron/co-patron |

---

## 2. FLUX D'ADHÉSION & CONNEXION

### 2.1 Création du compte (EXISTANT - pas de changement)

1. Nouvelle personne va sur `/signup` (ou `/auth`)
2. Remplit : Email + Mot de passe
3. Supabase Auth crée le compte
4. **Email de confirmation reçu** (déjà implémenté)
5. Confirme email
6. **Se connecte** avec Email + Mot de passe → Dashboard déverrouillé

### 2.2 NOUVEAU : Attente de confirmation direction

**⚠️ Employé BLOQUÉ au login tant que patron n'a pas approuvé**

Lors de la tentative de connexion :

```
┌────────────────────────────────────────┐
│ CONNEXION À PLANCHAIS                  │
├────────────────────────────────────────┤
│                                        │
│ Email : [pierre@gmail.com]             │
│ Mot de passe : [••••••]                │
│ Code PIN équipe : [optionnel]          │
│                                        │
│ [Se connecter]                         │
│                                        │
└────────────────────────────────────────┘
```

**Backend valide email + password**, mais vérifie status :

- Si status = `en_attente_confirmation` → ❌ **BLOQUÉ**
  
  ```
  ┌──────────────────────────────────┐
  │ ⏳ DEMANDE EN ATTENTE             │
  │                                  │
  │ Nom : Pierre Dupont              │
  │ Email : pierre@gmail.com         │
  │                                  │
  │ Votre demande d'accès a bien     │
  │ été envoyée à la direction.      │
  │ Demande reçue le : 2026-05-03    │
  │ à 14:30                          │
  │                                  │
  │ Veuillez attendre l'approbation  │
  │ du patron pour accéder.          │
  │                                  │
  │ [Retour à la connexion]          │
  └──────────────────────────────────┘
  ```

- Si status = `actif` → ✅ Connecté (si PIN correct)

**Points clés** :
- **UNE SEULE demande d'adhésion** à la création du compte
- Après première création, l'employé NE PEUT PAS se reconnecter tant que patron n'approuve pas
- Pas d'accès au dashboard, pas d'onglet équipe, rien
- Juste un message "En attente..." pour lui rappeler son email/nom et la date de la demande

### 2.3 Confirmation par Patron

Patron se connecte (email + password) → Onglet Équipe

```
┌───────────────────────────────────────────────────┐
│ En attente de confirmation (1)                    │
├───────────────────────────────────────────────────┤
│                                                   │
│ Nom : Pierre Dupont                              │
│ Email : pierre@gmail.com                         │
│ Demande reçue le : 2026-05-03 14:30             │
│                                                   │
│ [Confirmer et configurer] [Refuser]             │
│                                                   │
└───────────────────────────────────────────────────┘
```

Patron clique **[Confirmer et configurer]** :

```
┌─────────────────────────────────────────┐
│ Configuration du compte : Pierre Dupont │
├─────────────────────────────────────────┤
│                                         │
│ Rôle :                                  │
│ [Dropdown: Employé / Co-patron]         │
│                                         │
│ Permissions :                           │
│ [Lien vers page gestion permissions]    │
│                                         │
│ [Confirmer et approuver] [Annuler]     │
│                                         │
└─────────────────────────────────────────┘
```

Patron :
1. Choisit rôle (Employé ou Co-patron)
2. Clique [Suivant] → Page gestion permissions
3. Assigne les permissions (checkboxes)
4. Clique [Enregistrer et approuver]
5. Status = `actif`
6. **Email automatique envoyé à Pierre** :
   ```
   Votre accès a été approuvé !
   
   Rôle : Employé
   
   Vous pouvez maintenant vous connecter à l'application.
   Vous pouvez définir votre propre Code PIN dans l'onglet Équipe
   (optionnel mais recommandé pour la sécurité).
   
   Email : pierre@gmail.com
   Mot de passe : [celui qu'il a créé]
   ```

### 2.4 Connexion pour Pierre (nouvel employé approuvé)

Pierre reçoit l'email d'approbation. Pour se connecter :

**Formulaire de connexion** :
```
┌──────────────────────────────────┐
│ CONNEXION À PLANCHAIS            │
├──────────────────────────────────┤
│                                  │
│ Email :                          │
│ [pierre@gmail.com]               │
│                                  │
│ Mot de passe :                   │
│ [••••••••]                       │
│                                  │
│ Code PIN équipe (optionnel) :    │
│ []                               │
│                                  │
│ [Se connecter]                   │
│                                  │
│ Nouveau ? [Créer un compte]      │
│                                  │
└──────────────────────────────────┘
```

**Flux de vérification backend** :
1. Valide Email + Mot de passe avec Supabase Auth
2. Récupère `team_members` entry pour cet email + patron
3. Vérifie `status = 'actif'`
4. **Si PIN fourni** → Valide PIN = login_code stocké
5. **Si PIN absent/vide** → Accepte quand même (PIN optionnel)
6. Crée session avec `{ userId, memberId, role, permissions }`
7. ✅ Connecté !

**Important** : 
- PIN est **optionnel** au login (champ vide OK)
- Si employé a défini un PIN dans l'onglet Équipe, il DOIT le fournir
- Si pas de PIN défini, champ vide = OK

---

## 3. ONGLET ÉQUIPE - Interface Patron & Employé

### 3.0 Visibilité par rôle

| Qui voit l'onglet Équipe ? | Voir la liste ? | Voir son propre compte ? |
|------|--------|-------|
| **Patron** | ✅ Tous les employés | ✅ Mais généralement pas besoin |
| **Co-patron** | ✅ Employés seulement | ✅ Son propre compte |
| **Employé** | ❌ Non, onglet caché | ✅ Son compte dans une section "Mon profil" |

### 3.1 Vue d'ensemble (4 statuts)

```
┌─────────────────────────────────────┐
│ ÉQUIPE                              │
├─────────────────────────────────────┤
│ [En attente] [Actifs] [Bloqués] [Supprimés]
│
│ EN ATTENTE DE CONFIRMATION (3)
│ ├─ Pierre Dupont (pierre@...)
│ ├─ Marie Lefevre (marie@...)
│ └─ Luc Moreau (luc@...)
│
│ ACTIFS (15)
│ ├─ Jean Dupont (jean@...) - Employé - PIN: •••••• [Afficher]
│ ├─ Sophie Martin (sophie@...) - Employé
│ └─ ...
│
│ BLOQUÉS (2)
│ ├─ Tom Deschamps (tom@...)
│ └─ ...
│
│ SUPPRIMÉS / ARCHIVÉS (1)
│ └─ Alex Rousseau (alex@...) [Restaurer] [Supprimer définitivement]
```

### 3.2 Onglet "En attente"

Pour chaque personne :
- Nom
- Email
- "Demande reçue le [date]"
- **[Confirmer et configurer]** → Ouvre modal de configuration
- **[Refuser]** → Refuse la demande (status = refusé)

### 3.3 Onglet "Actifs"

```
┌───────────────────────────────────────────────┐
│ Jean Dupont                                   │
│ jean@gmail.com                                │
│                                               │
│ Rôle : [Dropdown: Employé/Co-patron]          │
│ Status : Actif  [Bloquer]                    │
│ Code PIN : •••••• [Afficher] [Régénérer]     │
│                                               │
│ Permissions assignées : 5/18                 │
│ [Gérer les permissions →]                    │
│                                               │
│ [Modifier] [Bloquer] [Supprimer]             │
└───────────────────────────────────────────────┘
```

**Actions possibles** :
- **[Gérer les permissions]** → Page permissions (voir section 4)
- **[Afficher PIN]** → Affiche le PIN masqué
- **[Régénérer PIN]** → Nouveau PIN généré + email envoyé au membre
- **[Modifier]** → Éditer nom, email, rôle
- **[Bloquer]** → Status = bloqué (ne peut plus se connecter) → peut être réactivé
- **[Supprimer]** → Status = supprimé (compte invisible mais données conservées)

### 3.4 Onglet "Bloqués"

- Nom, Email, Rôle
- **[Réactiver]** → Status = actif
- **[Supprimer]** → Status = supprimé

### 3.5 Onglet "Supprimés/Archivés"

- Nom, Email
- Grisés/italics (style désactivé)
- **[Restaurer]** → Status = actif (revient dans "Actifs")
- **[Supprimer définitivement]** → Vraiment supprimer de la DB + tous les données écrites par cette personne

### 3.6 Vue Employé : "Mon profil" (optionnel, peut être dans équipe ou ailleurs)

Quand employé est connecté, il voit son propre compte :

```
┌─────────────────────────────────────────┐
│ MON PROFIL ÉQUIPE                       │
├─────────────────────────────────────────┤
│                                         │
│ Nom : Pierre Dupont                    │
│ Email : pierre@gmail.com                │
│ Rôle : Employé                          │
│ Statut : Actif                          │
│                                         │
│ Code PIN personnel :                    │
│ ○ Aucun PIN défini                     │
│   [Définir mon PIN]                     │
│                                         │
│ OU                                      │
│                                         │
│ ✓ PIN défini : ••••••                  │
│   [Afficher] [Changer]                  │
│                                         │
│ Mes permissions :                       │
│ • Chantiers (mes chantiers)             │
│ • Planning (voir)                       │
│                                         │
└─────────────────────────────────────────┘
```

**Logique** :
- Employé voit SON compte uniquement
- Peut créer/changer son PIN
- Voit ses permissions (lecture seule)
- NE peut pas modifier ses propres permissions (que patron/co-patron)
- NE peut pas changer son rôle
- NE voit pas les autres employés

---

## 4. PAGE GESTION DES PERMISSIONS

### 4.1 Accès

- Via **[Gérer les permissions]** sur une ligne membre dans équipe
- URL : `/team-permissions/:memberId` ou modal

### 4.2 Interface

**En haut** :
```
Gestion des permissions : Jean Dupont
Rôle : Employé | Email : jean@gmail.com
```

**Contenu** : Tous les modules/onglets de l'app avec checkboxes :

```
┌──────────────────────────────────────────────┐
│ □ / ✓  TABLEAUX DE BORD                     │
│   ├─ □ / ✓  Voir mon dashboard              │
│   └─ □ / ✓  Voir dashboard équipe           │
│                                              │
│ □ / ✓  CHANTIERS                            │
│   ├─ □ / ✓  Voir mes chantiers              │
│   ├─ □ / ✓  Voir tous les chantiers         │
│   ├─ □ / ✓  Créer chantier                  │
│   ├─ □ / ✓  Modifier chantier               │
│   └─ □ / ✓  Supprimer chantier              │
│                                              │
│ □ / ✓  DEVIS                                │
│   ├─ □ / ✓  Voir mes devis                  │
│   ├─ □ / ✓  Voir tous les devis             │
│   ├─ □ / ✓  Créer devis                     │
│   ├─ □ / ✓  Modifier devis                  │
│   └─ □ / ✓  Supprimer devis                 │
│                                              │
│ □ / ✓  FACTURES                             │
│   ├─ □ / ✓  Voir mes factures               │
│   ├─ □ / ✓  Voir toutes les factures        │
│   ├─ □ / ✓  Créer facture                   │
│   ├─ □ / ✓  Modifier facture                │
│   └─ □ / ✓  Supprimer facture               │
│                                              │
│ □ / ✓  PLANNING                             │
│   ├─ □ / ✓  Voir planning                   │
│   └─ □ / ✓  Modifier planning               │
│                                              │
│ □ / ✓  ÉQUIPE                               │
│   ├─ □ / ✓  Voir liste équipe               │
│   └─ □ / ✓  Gérer équipe                    │
│                                              │
│ □ / ✓  CLIENTS / CRM                        │
│   ├─ □ / ✓  Voir clients                    │
│   ├─ □ / ✓  Créer client                    │
│   ├─ □ / ✓  Modifier client                 │
│   └─ □ / ✓  Supprimer client                │
│                                              │
│ [Enregistrer] [Annuler]                     │
└──────────────────────────────────────────────┘
```

**Logique** :
- Click sur checkbox = toggle permission
- **Parent checkbox** (ex: "CHANTIERS") = cocher/décocher TOUS les enfants
- **Enfants sans parent coché** = grisés, pas accessibles
- **[Enregistrer]** → MAJ en base de données
- **[Annuler]** → Retour sans changement

---

## 5. RESTRICTIONS D'ACCÈS & MODIFICATION

### 5.1 Qui peut modifier quoi ?

| Action | Patron | Co-patron | Employé |
|--------|--------|-----------|---------|
| Voir liste équipe | ✅ | ✅ | ❌ |
| Créer nouveau membre (demande) | N/A | N/A | ✅ (lui-même via signup) |
| Confirmer comptes en attente | ✅ | ❌ | ❌ |
| Assigner permissions | ✅ | ✅ (employés seulement) | ❌ |
| Changer PIN d'un membre | ✅ | ✅ (employés seulement) | ❌ |
| Changer rôle d'un membre | ✅ | ❌ (peut voir mais pas modifier) | ❌ |
| Modifier co-patron | ✅ | ❌ | ❌ |
| Bloquer/débloquer | ✅ | ✅ (employés seulement) | ❌ |
| Supprimer compte | ✅ | ✅ (employés seulement) | ❌ |
| Voir PIN des autres | ✅ | ✅ (employés seulement) | ❌ |

### 5.2 Visibilité

- **Patron** : voit Employés + Co-patrons
- **Co-patron** : voit Employés seulement (pas les autres Co-patrons)
- **Employé** : ne voit personne (pas d'onglet équipe)

---

## 6. DONNÉES SUPPRIMÉES

### 6.1 Suppression progressive

**Étape 1 : [Supprimer] sur membre actif**
- Status = `supprimé`
- Compte invisible dans l'onglet Équipe (principal)
- Compte visible dans onglet "Supprimés/Archivés"
- **TOUTES les données écrites par ce membre restent** (chantiers, devis, etc.)
- Auteur/propriété reste traçable (pour historique)

**Étape 2 : [Supprimer définitivement] sur compte supprimé**
- Données de `team_members` = supprimées
- **MAIS** : Avant suppression, un bouton **[Supprimer TOUT]** proposé
  ```
  ⚠️ Attention !
  Voulez-vous aussi supprimer TOUTES les données écrites par ce membre ?
  (Chantiers, devis, factures, etc.)
  
  □ Non, garder les données (attribuer à un autre membre)
  ☑ Oui, supprimer tout définitivement
  
  [Confirmer la suppression]
  ```

### 6.2 Logique

- Si patron choisit **"Garder les données"** :
  - Données restent
  - Auteur/propriétaire = `NULL` ou transféré à patron
  - Compte supprimer de `team_members`
  
- Si patron choisit **"Supprimer tout"** :
  - Supprimer `team_members` entry
  - Supprimer TOUS les documents/données créés par ce membre
  - Nettoyer complètement

---

## 7. STRUCTURE BASE DE DONNÉES

### 7.1 Table `auth.users` (Supabase Auth - existante)

```sql
-- Existante, pas de changement
-- email, password_hash, etc.
```

### 7.2 Table `public.user_profiles` (existante)

```sql
-- Existante, pour propriétaires/patrons
-- id (ref auth.users), full_name, email, created_at, updated_at
```

### 7.3 Table `public.team_members` (MODIFIÉE)

```sql
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Qui appartient à qui
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Patron propriétaire
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,      -- User Supabase Auth du membre (NEW)
  
  -- Info membre
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  
  -- Authentification
  login_code text NOT NULL,  -- PIN 6 chiffres (hashed ou plain, à décider)
  
  -- Rôle & Statut
  role text NOT NULL DEFAULT 'employee',  -- 'patron' | 'co-patron' | 'employee'
  status text NOT NULL DEFAULT 'en_attente_confirmation',  
  -- 'en_attente_confirmation' | 'actif' | 'bloqué' | 'supprimé' | 'refusé'
  
  -- Permissions (jsonb)
  permissions jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,  -- Quand patron a approuvé
  
  -- Constraints
  CONSTRAINT unique_email_per_owner UNIQUE(user_id, email),
  CONSTRAINT unique_pin_per_owner UNIQUE(user_id, login_code)
);

CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_auth_user_id ON public.team_members(auth_user_id);
CREATE INDEX idx_team_members_status ON public.team_members(user_id, status);
```

### 7.4 Schéma permissions (jsonb)

```json
{
  "dashboard": {
    "view_own": false,
    "view_team": false
  },
  "chantiers": {
    "view_own": false,
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  "devis": {
    "view_own": false,
    "view_all": false,
    "create": false,
    "edit": false,
    "delete": false
  },
  "factures": {
    "view_own": false,
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

## 8. ENDPOINTS BACKEND

### 8.1 Auth (Supabase Auth - existant)

```
POST   /auth/signup             -- Créer compte (email + password)
POST   /auth/login              -- Login (email + password + PIN équipe optionnel)
POST   /auth/logout             -- Logout
```

### 8.2 Équipe - Membres

```
GET    /api/team/members                    -- Liste membres (patron/co-patron seul)
GET    /api/team/members/:id                -- Détail d'un membre
POST   /api/team/members/:id/confirm        -- Confirmer un compte en attente
POST   /api/team/members/:id/refuse         -- Refuser une demande
PATCH  /api/team/members/:id                -- Modifier info (nom, email, rôle)
PATCH  /api/team/members/:id/pin            -- Régénérer PIN + envoyer email
PATCH  /api/team/members/:id/status         -- Changer status (actif/bloqué/supprimé)
PATCH  /api/team/members/:id/permissions    -- MAJ permissions
DELETE /api/team/members/:id                -- Soft delete (status = supprimé)
DELETE /api/team/members/:id/hard            -- Hard delete (vraiment supprimer)
DELETE /api/team/members/:id/data            -- Supprimer les données créées par ce membre
```

### 8.3 Permissions

```
GET    /api/team/members/:id/permissions    -- Récupérer permissions
PATCH  /api/team/members/:id/permissions    -- Mettre à jour permissions
```

---

## 9. VÉRIFICATION D'ACCÈS (Guard)

### 9.1 À la connexion

1. **Email + Password** → Valide avec Supabase Auth
2. **PIN fourni** → Valide PIN dans `team_members`
3. **Status check** → Si `en_attente_confirmation` → 401 "En attente d'approbation"
4. **Status check** → Si `bloqué` ou `refusé` → 403 "Accès refusé"
5. **Status check** → Si `supprimé` → 403 "Accès refusé"
6. **Gérer profil** → Créer/mettre à jour `user_profiles` si nouveau

### 9.2 À chaque action

Frontend vérifie `permissions[module][action]` avant d'afficher/permettre :
```javascript
if (!session.permissions?.chantiers?.view_all) {
  // Afficher message "Accès refusé"
  // Ou cacher le bouton
}
```

Backend double-check avant retourner données :
```typescript
// Si user demande chantiers, vérifier permission côté serveur
if (!permissions.chantiers.view_all && !permissions.chantiers.view_own) {
  res.status(403).json({ error: 'Accès refusé' })
}
```

---

## 10. PAGES FRONTEND

### Nouvelles ou modifiées

| Page | Statut |
|------|--------|
| `/auth/login` | **MODIFIER** : Ajouter champ PIN |
| `/team-members` | **MODIFIER** : Page gestion équipe (4 onglets) |
| `/team-permissions/:memberId` | **NOUVEAU** : Page gestion permissions |
| `/dashboard` | **MODIFIER** : Afficher "En attente..." si status ≠ actif |
| Tous les modules | **MODIFIER** : Vérifier permissions avant afficher |

---

## 11. SÉCURITÉ

- **RLS Supabase** : Patron peut voir/modifier que SES membres (WHERE user_id = auth.uid())
- **Co-patron RLS** : Peut voir/modifier employés seulement (WHERE role = 'employee')
- **CSRF** : Tous POST/PATCH/DELETE protégés
- **PIN** : Stocker hashé en base (pas plain text)
- **Email automatique** : Envoyer via Resend (backend) après confirmation
- **Double authentification** : Email/Password + PIN (défense en profondeur)
- **Session token** : Encoder userId, memberId, role, permissions (pas modifiable client)
- **Audit** : Logger les changements de permissions/status (optionnel v2)

---

## 12. EXEMPLE SCÉNARIO COMPLET

### Jour 1 : Jean (Patron) crée son compte

1. Jean va sur `/signup`
2. Rentre : Email = "jean@gmail.com" + Password
3. Supabase crée `auth.users` entry
4. Email de confirmation reçu
5. Confirme email
6. Se connecte avec email + password
7. Voit dashboard vide (pas de PIN requis pour patron)

### Jour 2 : Pierre demande l'accès

1. Pierre va sur `/signup`
2. Rentre : Email = "pierre@gmail.com" + Password
3. Supabase crée `auth.users` entry
4. Email de confirmation reçu
5. Confirme email
6. Se connecte avec email + password
7. Voit message "⏳ En attente de confirmation"
8. Backend crée `team_members` entry avec status = `en_attente_confirmation`

### Jour 3 : Jean approuve Pierre

1. Jean se connecte (email + password)
2. Onglet Équipe → "En attente" → voit Pierre
3. Clique [Confirmer et configurer]
4. Modal s'ouvre : choisit rôle = "Employé"
5. Génère PIN = "654321"
6. Clique [Suivant] → Page permissions
7. Coche :
   - Chantiers > Voir mes chantiers
   - Planning > Voir planning
8. Clique [Enregistrer]
9. Backend MAJ `team_members` :
   - status = "actif"
   - confirmed_at = now()
   - role = "employee"
   - permissions = {...}
   - login_code = "654321"
10. **Email automatique à Pierre** :
    ```
    Votre accès a été approuvé !
    
    Rôle : Employé
    Code PIN : 654321
    
    Pour vous connecter, allez sur la page de connexion.
    ```

### Jour 4 : Pierre se connecte

1. Pierre va sur `/auth/login`
2. Remplit :
   - Email = "pierre@gmail.com"
   - Password = "..."
   - Code PIN = "654321"
3. Backend valide tout
4. ✅ Connecté ! Voit dashboard
5. Navigation : seul "Chantiers" (mes) + "Planning" sont accessibles
6. Autres modules = grisés/cachés

### Jour 5 : Jean change les permissions de Pierre

1. Jean onglet Équipe → "Actifs" → Pierre
2. Clique [Gérer les permissions]
3. Ajoute : Chantiers > Voir TOUS les chantiers
4. Clique [Enregistrer]
5. Pierre rafraîchit le dashboard → voit maintenant TOUS les chantiers

### Jour 6 : Jean bloque Pierre (temporairement)

1. Jean clique [Bloquer] sur Pierre
2. Status = "bloqué"
3. Pierre essaie de se connecter → 403 "Accès refusé"

### Jour 7 : Jean supprime les données de Pierre

1. Jean clique [Supprimer] sur Pierre → Status = "supprimé"
2. Pierre invisible dans "Actifs"
3. Jean clique onglet "Supprimés" → voit Pierre
4. Clique [Supprimer définitivement]
5. Modal : "Supprimer aussi toutes les données créées par Pierre ?"
   - Si Oui : Supprimer tous les chantiers/devis créés par Pierre
   - Si Non : Garder les données (attribuer à Jean)

---

**✅ OK pour créer le prompt Cursor avec cette spec ?**
