# ⚙️ Configuration Variables d'Env Vercel - URGENT

## 🔴 Problème
L'application affiche : `Configuration manquante (VITE_OWNER_IDS)`

## ✅ Solution - Ajouter les variables d'env sur Vercel

### **Étape 1 : Ouvrir le dashboard Vercel**
👉 https://vercel.com/yohannmarques746-specs-projects/btp-app/settings/environment-variables

### **Étape 2 : Ajouter `VITE_OWNER_IDS`**

| Champ | Valeur |
|-------|--------|
| **Name** | `VITE_OWNER_IDS` |
| **Value** | `7eef8d67-dc97-4957-8863-7be105c1d272` |
| **Environment** | ✅ Production, ✅ Preview, ✅ Development |

> Note : `7eef8d67-...` = calde81@hotmail.com (patron principal). Le compte dev yohannmarques746@gmail.com (`d878bc5d-...`) est ajouté comme co-owner via la table `app_co_owners`, pas via cette variable.

**Puis cliquez : "Save"**

### **Étape 3 : Redéployer**
1. Allez sur https://vercel.com/yohannmarques746-specs-projects/btp-app/deployments
2. Cliquez sur le dernier déploiement (tout en haut)
3. Cliquez sur **"Redeploy"** (bouton en haut à droite)

---

## 🎯 Résultat attendu
- ✅ Vercel redéploiera avec les bonnes variables
- ✅ L'erreur disparaîtra
- ✅ Yohann et Bruno auront accès complet

---

## 📋 Alternative : CLI Vercel (si vous avez vercel CLI)
```bash
cd /Users/yohannmarques/Desktop/PLANCHAIS-app-main
vercel env add VITE_OWNER_IDS
# Puis tapez: 7eef8d67-dc97-4957-8863-7be105c1d272
# Sélectionnez: Production, Preview, Development
vercel deploy --prod
```

---

⏱️ **Temps estimé:** 2-3 minutes
