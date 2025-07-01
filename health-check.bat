@echo off
REM Health check pour PointFlex
echo 🏥 Vérification de santé de PointFlex...

REM Vérification du frontend
echo 📱 Test du frontend...
curl -s http://localhost:3000 > nul
if %errorlevel% equ 0 (
    echo ✅ Frontend accessible sur http://localhost:3000
) else (
    curl -s http://localhost:5173 > nul
    if %errorlevel% equ 0 (
        echo ✅ Frontend accessible sur http://localhost:5173
    ) else (
        echo ❌ Frontend non accessible
    )
)

REM Vérification du backend
echo 🔧 Test du backend...
curl -s http://localhost:5000/health > nul
if %errorlevel% equ 0 (
    echo ✅ Backend accessible sur http://localhost:5000
) else (
    echo ❌ Backend non accessible
)

REM Vérification de la base de données
echo 🗄️  Test de la base de données...
if exist "backend\instance\pointflex.db" (
    echo ✅ Base de données trouvée
) else (
    echo ❌ Base de données manquante
)

REM Vérification des fichiers de configuration
echo ⚙️  Test de la configuration...
if exist ".env" (
    echo ✅ Fichier .env trouvé
) else (
    echo ⚠️  Fichier .env manquant (optionnel)
)

echo.
echo 📊 Vérification terminée!
pause
