@echo off
echo Exécution de toutes les migrations pour résoudre les problèmes de colonnes manquantes...
echo.
echo 1. Ajout de geolocation_max_accuracy dans la table companies
python -m run_geolocation_migration
echo.
echo 2. Ajout de mission_id et mission_order_number dans la table pointages
python -m run_mission_migration
echo.
echo 3. Ajout de device_id dans la table pointages et geolocation_max_accuracy dans la table offices
cd backend
python -m migrations.add_missing_columns
cd ..
echo.
echo 4. Ajout de location dans la table missions
cd backend
python -m migrations.add_mission_location
cd ..
echo.
echo 5. Ajout des colonnes de géolocalisation dans la table missions
cd backend
python -m migrations.add_mission_geo
cd ..
echo.
echo Migrations terminées. Vérifiez les messages ci-dessus pour confirmer le succès.
pause
