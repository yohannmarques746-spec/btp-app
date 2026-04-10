# Rapport d'audit — App CALDY BTP
*Audit réalisé page par page, composant par composant*

---

## ÉTAT GÉNÉRAL

### Pages 100% fonctionnelles (données réelles Supabase)
- Devis (QuotesPage) ✅
- Factures (PaymentsPage) ✅ *(refait récemment)*
- Chantiers (ProjectsPage + FicheChantier) ✅
- Clients (ClientsPage) ✅
- Planning (PlanningPage) ✅
- Équipe (TeamPage) ✅
- Paramètres / Profil entreprise (SettingsPage) ✅

### Pages placeholder (rien derrière)
- **Prospects** → page vide avec "Bientôt disponible"
- **Analytics** → page vide avec "Bientôt disponible"
- **CRM Pipeline** → données entièrement mockées (Jean Dupont hardcodé en dur)

---

## RAPPORT POINT PAR POINT

---

### 1. MANQUE CRITIQUE — Convertir un devis en facture en 1 clic
**Pourquoi c'est pertinent :** Dans le BTP, la séquence normale est : devis accepté → facture. Aujourd'hui il faut tout ressaisir à la main. Un bouton "Transformer en facture" sur un devis accepté copierait toutes les lignes, le client, le montant, et ouvrirait directement la facture pré-remplie. C'est l'action la plus répétée dans le métier.

---

### 2. MANQUE IMPORTANT — Catalogue de prestations / tarifs standards
**Pourquoi c'est pertinent :** Un plaquiste, un carreleur ou un peintre a toujours les mêmes 20-30 prestations qu'il refacture. Aujourd'hui il retape tout à chaque devis (description, unité, prix unitaire). Un catalogue personnel enregistré en base permettrait d'insérer une prestation en 2 clics. Gain de temps estimé : 15-20 min par devis.

---

### 3. MANQUE IMPORTANT — Duplication d'un devis existant
**Pourquoi c'est pertinent :** Beaucoup de chantiers se ressemblent (même type de travaux, même zone géo). Pouvoir dupliquer un devis existant et juste changer le client + quelques lignes est bien plus rapide que de repartir de zéro. Aujourd'hui ce bouton n'existe pas.

---

### 4. MANQUE IMPORTANT — Vue Gantt dans le Planning
**Pourquoi c'est pertinent :** Le calendrier mensuel existe (RDV), mais les chantiers n'y apparaissent pas comme des barres de durée. Dans le BTP, planifier les équipes c'est voir "Chantier A : 3 semaines à partir du 12 mai, Chantier B démarre quand A finit". Une vue Gantt même simple (barre par chantier sur une frise semaine/mois) est l'outil numéro 1 du conducteur de travaux.

---

### 5. MANQUE IMPORTANT — Lien factures ↔ fiche chantier
**Pourquoi c'est pertinent :** La fiche chantier a une section "Documents liés" mais elle ne liste que des liens texte saisis manuellement. Il n'y a aucune connexion automatique avec les vraies factures créées dans Factures. Du coup le suivi financier d'un chantier (montant devisé vs facturé vs encaissé) n'est pas en temps réel. C'est une info cruciale en BTP pour savoir si un chantier est rentable.

---

### 6. MANQUE IMPORTANT — Relance automatique des devis non répondus
**Pourquoi c'est pertinent :** Un devis envoyé et non répondu après 7-15 jours, ça se perd. Aujourd'hui aucune alerte n'existe. Une notification simple "Le devis DEV-2026-003 (Martin) n'a pas reçu de réponse depuis 10 jours" dans le dashboard économise des ventes ratées. C'est automatique et ne demande aucune action au patron.

---

### 7. MANQUE IMPORTANT — Tableau de bord financier avec graphes
**Pourquoi c'est pertinent :** La page Analytics est un placeholder vide. Pourtant les données sont là (factures, chantiers, devis). Un simple graphique "CA mensuel des 6 derniers mois" + "Impayés en cours" + "Devis vs facturé" donnerait au patron une vision immédiate de sa santé financière sans ouvrir un tableur.

---

### 8. CRM — Données entièrement mockées
**Pourquoi c'est pertinent :** La page CRM Pipeline affiche "Jean Dupont" hardcodé en dur dans le code. Aucun vrai prospect n'est stocké en base. Le drag & drop entre les colonnes ne persiste pas (rechargement = reset). Le bouton "Connecter Email" ne fait rien. C'est la page la plus incomplète fonctionnellement.

---

### 9. MANQUE PRATIQUE — Saisie rapide d'une dépense chantier
**Pourquoi c'est pertinent :** Sur le terrain, un chef de chantier achète des matériaux, reçoit un ticket. Aujourd'hui aucun endroit simple pour noter "Chantier Martin — Matériaux — 340 CHF" rapidement depuis mobile. La section Matériaux dans la fiche chantier existe mais elle est complexe à remplir (plusieurs champs). Un mini-formulaire "dépense rapide" avec montant + chantier + catégorie serait utilisé quotidiennement.

---

### 10. MANQUE PRATIQUE — Recherche globale
**Pourquoi c'est pertinent :** Trouver un client, un devis ou un chantier aujourd'hui demande d'aller dans chaque section séparément. Une barre de recherche universelle (accessible depuis le header ou avec un raccourci clavier) qui cherche dans tous les éléments en même temps fait gagner 2-3 minutes à chaque fois qu'on cherche quelque chose.

---

### 11. MANQUE PRATIQUE — Statut chantier pas mis à jour automatiquement
**Pourquoi c'est pertinent :** Un chantier créé avec date de début = aujourd'hui reste en statut "planifié" même si la date est passée. Aucun mécanisme ne le passe automatiquement en "en cours". Même chose pour "terminé" si la date de fin est dépassée. C'est fait pour les factures (en retard auto) mais pas pour les chantiers.

---

### 12. MANQUE PRATIQUE — Export comptable (CSV/Excel)
**Pourquoi c'est pertinent :** Le comptable de l'entrepreneur demande toujours un fichier avec les factures de la période. Aujourd'hui aucun export n'existe. Un bouton "Exporter les factures Q1 2026 en CSV" évite de tout recopier à la main dans un tableur. Simple à faire techniquement, énorme gain de temps en fin de trimestre.

---

### 13. MANQUE PRATIQUE — Conditions de paiement sur les devis (acompte)
**Pourquoi c'est pertinent :** Dans le BTP suisse, il est courant de demander 30% d'acompte à la commande, 40% en cours de chantier, 30% à la réception. Ce type de découpage n'est pas gérable aujourd'hui dans les devis. Une option "Devis avec échéancier de paiement" permettrait de présenter ça proprement au client.

---

### 14. MANQUE PRATIQUE — Photo de chantier depuis mobile avec géolocalisation
**Pourquoi c'est pertinent :** L'upload de photos existe sur les chantiers mais c'est basique. En BTP, les photos sont la preuve de l'état avant/après et servent en cas de litige. Ajouter automatiquement la date et l'heure sur la photo (comme un watermark) au moment de l'upload dans la fiche chantier est une petite feature très professionnelle.

---

### 15. UX — Pas de confirmation visuelle après envoi d'un devis
**Pourquoi c'est pertinent :** Quand on passe un devis en statut "envoyé", rien dans l'interface ne change vraiment (pas de date d'envoi enregistrée, pas de badge visible). Enregistrer automatiquement la date d'envoi permettrait de calculer le délai de réponse et de déclencher les relances (point 6).

---

### 16. UX — Bouton "Nouveau chantier" présent dans le dashboard mais ne fonctionne qu'à moitié
**Pourquoi c'est pertinent :** Le bouton "Nouveau Chantier" dans les Actions Rapides du dashboard redirige vers `/dashboard/projects?openDialog=true` ce qui ouvre bien le dialog — c'est bien. Mais le bouton "Créer un Devis" redirige juste vers la page Devis sans ouvrir directement le formulaire. Il faudrait le même mécanisme `?openForm=true` pour cohérence.

---

### 17. UX — Section "Affectation aux Chantiers" dans l'Équipe est un placeholder
**Pourquoi c'est pertinent :** La page Équipe affiche : "Affectez les membres de l'équipe aux chantiers depuis la fiche chantier ou depuis le planning. Cette fonctionnalité vous permet de suivre qui travaille sur quel projet." Mais ce n'est pas possible depuis la fiche chantier non plus (le champ `ouvriersAssignes` dans ChantierDetails n'est pas connecté aux vrais membres de l'équipe en base).

---

### 18. UX — Le Dashboard "Vue d'ensemble" affiche €0 partout
**Pourquoi c'est pertinent :** Le chiffre d'affaires estimé est calculé comme `chantiersTermines * 12500` (valeur arbitraire hardcodée). Ce n'est pas connecté aux vraies factures. Un entrepreneur qui voit "CA : €0" alors qu'il a des factures dans l'app perd confiance dans l'outil.

---

### 19. UX — Prospects et Analytics dans la sidebar sans contenu
**Pourquoi c'est pertinent :** Ces deux liens sont dans la sidebar mais mènent à des pages vides. C'est frustrant. Soit on les cache (condition dans la sidebar) jusqu'à ce qu'elles soient prêtes, soit on y met quelque chose d'utile immédiatement. Une Analytics basique avec les données des factures existantes serait faisable en quelques heures.

---

### 20. SÉCURITÉ — Code de connexion des membres visible en clair
**Pourquoi c'est pertinent :** Dans la liste des membres de l'équipe, le code de connexion (`login_code`) est affiché directement à l'écran pour chaque membre. N'importe qui qui regarde l'écran peut voir les codes. Il faudrait masquer par défaut (•••••) avec un bouton "afficher" individuel.

---

## RÉSUMÉ DES PRIORITÉS

| Priorité | Feature | Effort |
|----------|---------|--------|
| 🔴 Critique | Convertir devis → facture | Moyen |
| 🔴 Critique | Dashboard financier connecté aux vraies données | Moyen |
| 🟠 Important | Catalogue de prestations | Moyen |
| 🟠 Important | Duplication d'un devis | Petit |
| 🟠 Important | Relance automatique des devis | Petit |
| 🟠 Important | Lien factures ↔ fiche chantier | Moyen |
| 🟡 Pratique | Export CSV comptable | Petit |
| 🟡 Pratique | Recherche globale | Moyen |
| 🟡 Pratique | Vue Gantt planning | Grand |
| 🟡 Pratique | Statut chantier automatique | Petit |
| 🟡 Pratique | Masquer codes de connexion | Petit |
| ⚪ Long terme | CRM fonctionnel (vraies données) | Grand |
| ⚪ Long terme | Signature électronique devis | Grand |
