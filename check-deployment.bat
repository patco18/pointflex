@echo off
REM Script de vérification avant déploiement
echo 🔍 Vérification du projet avant déploiement...

set ERROR_COUNT=0

echo.
echo 📋 Vérification des fichiers requis...

REM Vérification des fichiers essentiels
if not exist "package.json" (
    echo ❌ package.json manquant
    set /a ERROR_COUNT+=1
) else (
    echo ✅ package.json trouvé
)

if not exist "backend\requirements.txt" (
    echo ❌ backend\requirements.txt manquant
    set /a ERROR_COUNT+=1
) else (
    echo ✅ requirements.txt trouvé
)

if not exist "Dockerfile" (
    echo ❌ Dockerfile manquant
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Dockerfile trouvé
)

if not exist "docker-compose.yml" (
    echo ❌ docker-compose.yml manquant
    set /a ERROR_COUNT+=1
) else (
    echo ✅ docker-compose.yml trouvé
)

if not exist ".env.example" (
    echo ❌ .env.example manquant
    set /a ERROR_COUNT+=1
) else (
    echo ✅ .env.example trouvé
)

if not exist ".gitignore" (
    echo ❌ .gitignore manquant
    set /a ERROR_COUNT+=1
) else (
    echo ✅ .gitignore trouvé
)

echo.
echo 🔧 Vérification des outils requis...

REM Vérification de Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js non installé
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Node.js installé
)

REM Vérification de Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python non installé
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Python installé
)

REM Vérification de Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker non installé
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Docker installé
)

REM Vérification de Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git non installé
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Git installé
)

echo.
echo 📦 Vérification des dépendances...

REM Vérification node_modules
if not exist "node_modules" (
    echo ⚠️  node_modules manquant - exécutez 'npm install'
    set /a ERROR_COUNT+=1
) else (
    echo ✅ node_modules présent
)

echo.
echo 🏗️  Test de construction...

REM Test de build frontend
echo Tentative de build frontend...
npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur de build frontend
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Build frontend réussi
)

echo.
if %ERROR_COUNT% equ 0 (
    echo 🎉 Toutes les vérifications sont passées!
    echo ✅ Le projet est prêt pour le déploiement.
    echo.
    echo 🚀 Vous pouvez maintenant:
    echo   - Déployer avec: deploy.bat
    echo   - Pousser sur GitHub avec: push-to-github.bat
) else (
    echo ❌ %ERROR_COUNT% erreur(s) détectée(s)
    echo 🔧 Veuillez corriger les erreurs avant de déployer.
)

echo.
pause
