@echo off
REM Script de déploiement pour PointFlex (Windows)
echo 🚀 Déploiement de PointFlex...

REM Vérification de Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker est requis mais non installé. Abandon.
    pause
    exit /b 1
)

REM Vérification de Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose est requis mais non installé. Abandon.
    pause
    exit /b 1
)

REM Création du fichier .env si il n'existe pas
if not exist .env (
    echo 📝 Création du fichier .env...
    copy .env.example .env
    echo ⚠️  Veuillez modifier le fichier .env avec vos valeurs avant de continuer.
    echo ⚠️  Notamment SECRET_KEY et JWT_SECRET_KEY pour la production!
    pause
)

REM Arrêt des conteneurs existants
echo 🛑 Arrêt des conteneurs existants...
docker-compose down

REM Construction et démarrage
echo 🔨 Construction et démarrage des conteneurs...
docker-compose up --build -d

REM Initialisation de la base de données
echo 🗄️  Initialisation de la base de données...
docker-compose exec backend python init_db.py

REM Vérification du statut
echo ✅ Vérification du statut...
docker-compose ps

echo.
echo 🎉 Déploiement terminé!
echo 📱 Frontend disponible sur: http://localhost
echo 🔧 Backend API disponible sur: http://localhost:5000
echo.
echo 📋 Commandes utiles:
echo   - Voir les logs: docker-compose logs -f
echo   - Arrêter: docker-compose down
echo   - Redémarrer: docker-compose restart
pause
