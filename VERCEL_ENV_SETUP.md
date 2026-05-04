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
| **Value** | `4709322a-1d4b-4ac1-adf1-34329f31ce58,7eef8d67-dc97-4957-8863-7be105c1d272` |
| **Environment** | ✅ Production, ✅ Preview, ✅ Development |

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
# Puis tapez: 4709322a-1d4b-4ac1-adf1-34329f31ce58,7eef8d67-dc97-4957-8863-7be105c1d272
# Sélectionnez: Production
vercel deploy --prod
```

---

⏱️ **Temps estimé:** 2-3 minutes
