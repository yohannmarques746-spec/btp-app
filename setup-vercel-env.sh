#!/bin/bash

# Script pour configurer les variables d'env Vercel
# Utilisation : bash setup-vercel-env.sh

echo "🔧 Configuration des variables d'env Vercel"
echo "==========================================="
echo ""

# Vérifier si vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI n'est pas installé."
    echo ""
    echo "Installation automatique..."
    npm install -g vercel
fi

echo ""
echo "📋 Configuration:"
echo "  Name: VITE_OWNER_IDS"
echo "  Value: 4709322a-1d4b-4ac1-adf1-34329f31ce58,7eef8d67-dc97-4957-8863-7be105c1d272"
echo ""

# Aller au répertoire du projet
cd "$(dirname "$0")" || exit 1

# Ajouter la variable d'env via Vercel CLI
echo "⏳ Ajout de la variable d'env..."
vercel env add VITE_OWNER_IDS

echo ""
echo "✅ Variable ajoutée!"
echo ""
echo "📦 Redéploiement en cours..."
vercel deploy --prod

echo ""
echo "🎉 Terminé!"
echo ""
echo "L'application sera disponible à:"
echo "  👉 https://btp-app.vercel.app"
echo ""
