@echo off
echo ======================================
echo Test du systeme de notification d'emails pour les abonnements expirants
echo ======================================
echo.

REM Accéder au répertoire racine du projet
cd /d "%~dp0"

REM Exécuter avec le chemin complet pour s'assurer que Python trouve le bon module
python -m backend.tests.test_subscription_emails_mailer

echo.
echo Test termine.
pause
