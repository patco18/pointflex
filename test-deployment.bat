@echo off
REM Test rapide du déploiement PointFlex
echo 🧪 Test de déploiement PointFlex...

REM Création d'un fichier .env de test
if not exist .env (
    echo 📝 Création d'un fichier .env de test...
    echo VITE_API_URL=http://localhost:5000/api > .env
    echo FLASK_ENV=development >> .env
    echo SECRET_KEY=test-secret-key-for-demo >> .env
    echo JWT_SECRET_KEY=test-jwt-secret-key-for-demo >> .env
    echo DATABASE_URL=sqlite:///instance/pointflex.db >> .env
    echo CORS_ORIGINS=http://localhost:3000,http://localhost:5173 >> .env
)

REM Test du backend
echo 🐍 Test du backend Python...
cd backend
python -c "import app; print('✅ Backend imports OK')"
if %errorlevel% neq 0 (
    echo ❌ Erreur backend
    cd ..
    pause
    exit /b 1
)

REM Initialisation de la base de données
echo 🗄️  Initialisation de la base de données...
python init_db.py
cd ..

REM Test du frontend
echo ⚛️  Test du build frontend...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Erreur build frontend
    pause
    exit /b 1
)

echo.
echo 🎉 Tests réussis! Le projet est prêt pour le déploiement.
echo.
echo 📋 Pour démarrer en développement:
echo   1. Terminal 1: cd backend ^&^& python app.py
echo   2. Terminal 2: npm run dev
echo.
echo 🔐 Comptes de test:
echo   SuperAdmin: superadmin@pointflex.com / superadmin123
echo   Admin: admin@pointflex.com / admin123
echo   Employé: employee@pointflex.com / employee123
echo.
echo 🌐 Projet GitHub: https://github.com/patco18/pointflex
pause
