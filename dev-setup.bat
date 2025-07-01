@echo off
REM Script de développement pour PointFlex
echo 🔧 Démarrage de l'environnement de développement...

REM Vérification des prérequis
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js est requis mais non installé.
    pause
    exit /b 1
)

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python est requis mais non installé.
    pause
    exit /b 1
)

REM Installation des dépendances frontend
echo 📦 Installation des dépendances frontend...
npm install

REM Installation des dépendances backend
echo 📦 Installation des dépendances backend...
cd backend
pip install -r requirements.txt
cd ..

REM Création du fichier .env si nécessaire
if not exist .env (
    echo 📝 Création du fichier .env...
    copy .env.example .env
)

echo.
echo 🎉 Environnement de développement prêt!
echo.
echo 📋 Pour démarrer:
echo   Frontend: npm run dev
echo   Backend: cd backend && python app.py
echo.
echo 🐳 Ou utilisez Docker avec: docker-compose -f docker-compose.dev.yml up
pause
