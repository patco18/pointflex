@echo off
echo ======================================
echo Test simple du systeme d'emails pour les notifications d'expiration
echo ======================================
echo.

REM Accéder au répertoire racine du projet
cd /d "%~dp0"

REM Exécuter avec le chemin complet pour s'assurer que Python trouve le bon module
python -m backend.tests.test_subscription_email_simple

echo.
echo Test termine. Ouverture des emails generes...

REM Ouvrir les emails générés dans le navigateur par défaut
start "" "backend\tests\subscription_expiring_soon_email.html"
start "" "backend\tests\subscription_expired_email.html"

echo.
echo Les templates d'emails ont ete generes et ouverts dans votre navigateur par defaut.
pause
