@echo off
echo Exécution de toutes les migrations pour résoudre les problèmes de colonnes manquantes...
echo.
echo 1. Ajout de geolocation_max_accuracy dans la table companies
python -m run_geolocation_migration
echo.
echo 2. Ajout de mission_id et mission_order_number dans la table pointages
python -m run_mission_migration
echo.
echo Migrations terminées. Vérifiez les messages ci-dessus pour confirmer le succès.
pause
