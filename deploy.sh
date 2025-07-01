#!/bin/bash

# Script de déploiement pour PointFlex
echo "🚀 Déploiement de PointFlex..."

# Vérification des prérequis
command -v docker >/dev/null 2>&1 || { echo "❌ Docker est requis mais non installé. Abandon." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose est requis mais non installé. Abandon." >&2; exit 1; }

# Création du fichier .env si il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp .env.example .env
    echo "⚠️  Veuillez modifier le fichier .env avec vos valeurs avant de continuer."
    echo "⚠️  Notamment SECRET_KEY et JWT_SECRET_KEY pour la production!"
    read -p "Appuyez sur Entrée pour continuer..."
fi

# Arrêt des conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down

# Construction et démarrage
echo "🔨 Construction et démarrage des conteneurs..."
docker-compose up --build -d

# Initialisation de la base de données
echo "🗄️  Initialisation de la base de données..."
docker-compose exec backend python init_db.py

# Vérification du statut
echo "✅ Vérification du statut..."
docker-compose ps

echo ""
echo "🎉 Déploiement terminé!"
echo "📱 Frontend disponible sur: http://localhost"
echo "🔧 Backend API disponible sur: http://localhost:5000"
echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: docker-compose logs -f"
echo "  - Arrêter: docker-compose down"
echo "  - Redémarrer: docker-compose restart"
