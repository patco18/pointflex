#!/bin/bash

# Installation rapide de PointFlex
echo "🚀 Installation rapide de PointFlex..."

echo "📋 Vérification des prérequis..."
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js requis: https://nodejs.org/"
    exit 1
fi

if ! command -v python >/dev/null 2>&1; then
    echo "❌ Python requis: https://python.org/"
    exit 1
fi

if ! command -v git >/dev/null 2>&1; then
    echo "❌ Git requis: https://git-scm.com/"
    exit 1
fi

echo "✅ Tous les prérequis sont installés!"

echo "📦 Installation des dépendances frontend..."
npm install

echo "📦 Installation des dépendances backend..."
cd backend
pip install -r requirements.txt
cd ..

echo "⚙️  Configuration de l'environnement..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé depuis .env.example"
else
    echo "✅ Fichier .env existe déjà"
fi

echo "🗄️  Initialisation de la base de données..."
cd backend
python init_db.py
cd ..

echo
echo "🎉 Installation terminée!"
echo
echo "🚀 Pour démarrer le développement:"
echo "  Frontend: npm run dev"
echo "  Backend: cd backend && python app.py"
echo
echo "🐳 Ou utilisez Docker: docker-compose -f docker-compose.dev.yml up"
echo
echo "📋 Comptes de test créés:"
echo "  SuperAdmin: superadmin@pointflex.com / superadmin123"
echo "  Admin: admin@pointflex.com / admin123"
echo "  Employé: employee@pointflex.com / employee123"
