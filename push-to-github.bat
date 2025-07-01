@echo off
REM Script pour initialiser et pousser le projet sur GitHub
echo 🚀 Initialisation du projet Git et push vers GitHub...

REM Vérification que Git est installé
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git est requis mais non installé.
    pause
    exit /b 1
)

REM Initialisation du repo Git si nécessaire
if not exist .git (
    echo 📝 Initialisation du repository Git...
    git init
    git branch -M main
)

REM Ajout du remote GitHub
echo 🔗 Configuration du remote GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/patco18/pointflex.git

REM Ajout de tous les fichiers
echo 📦 Ajout des fichiers...
git add .

REM Commit initial
echo 💾 Commit initial...
git commit -m "feat: initial commit - PointFlex SaaS system

- Multi-tenant attendance management system
- React frontend with TypeScript
- Flask backend with SQLite
- Docker deployment ready
- Role-based access (SuperAdmin, Admin, Employee)
- Geofencing and office attendance
- Modern UI with Tailwind CSS"

REM Push vers GitHub
echo 📤 Push vers GitHub...
git push -u origin main

echo.
echo ✅ Projet poussé vers GitHub avec succès!
echo 🌐 Votre projet est maintenant disponible sur: https://github.com/patco18/pointflex
echo.
echo 📋 Prochaines étapes:
echo   1. Aller sur GitHub et vérifier que tout est là
echo   2. Configurer les GitHub Secrets pour CI/CD:
echo      - DOCKER_USERNAME
echo      - DOCKER_PASSWORD
echo   3. Modifier le README si nécessaire
echo   4. Inviter des collaborateurs si souhaité
pause
