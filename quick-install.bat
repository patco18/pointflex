@echo off
REM Installation rapide de PointFlex
echo 🚀 Installation rapide de PointFlex...
echo.

REM Vérification des prérequis
echo 📋 Vérification des prérequis...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js requis: https://nodejs.org/
    pause
    exit /b 1
)

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python requis: https://python.org/
    pause
    exit /b 1
)

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git requis: https://git-scm.com/
    pause
    exit /b 1
)

echo ✅ Tous les prérequis sont installés!
echo.

REM Installation des dépendances
echo 📦 Installation des dépendances frontend...
npm install

echo 📦 Installation des dépendances backend...
cd backend
pip install -r requirements.txt
cd ..

REM Configuration environnement
echo ⚙️  Configuration de l'environnement...
if not exist .env (
    copy .env.example .env
    echo ✅ Fichier .env créé depuis .env.example
) else (
    echo ✅ Fichier .env existe déjà
)

REM Initialisation base de données
echo 🗄️  Initialisation de la base de données...
cd backend
python init_db.py
cd ..

echo.
echo 🎉 Installation terminée!
echo.
echo 🚀 Pour démarrer le développement:
echo   Frontend: npm run dev
echo   Backend: cd backend ^&^& python app.py
echo.
echo 🐳 Ou utilisez Docker: docker-compose -f docker-compose.dev.yml up
echo.
echo 📋 Comptes de test créés:
echo   SuperAdmin: superadmin@pointflex.com / superadmin123
echo   Admin: admin@pointflex.com / admin123
echo   Employé: employee@pointflex.com / employee123
echo.
pause
