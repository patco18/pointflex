# Liste de vérification des schémas de base de données

Ce document liste toutes les migrations nécessaires pour mettre à jour le schéma de la base de données pour l'application PointFlex.

## Migrations créées

1. **add_geolocation_max_accuracy.py**
   - Ajoute la colonne `geolocation_max_accuracy` à la table `companies`
   - Valeur par défaut : `100` (définie dans Config.GEOLOCATION_MAX_ACCURACY)

2. **add_mission_columns.py**
   - Ajoute les colonnes suivantes à la table `pointages`:
     - `mission_id` (INTEGER, peut être NULL)
     - `mission_order_number` (VARCHAR(100), peut être NULL)

## Comment exécuter les migrations

Pour exécuter toutes les migrations nécessaires, utilisez le script batch fourni :

```
fix-db-schema.bat
```

Ou exécutez individuellement les scripts Python pour chaque migration :

```
python -m run_geolocation_migration
python -m run_mission_migration
```

## Vérifier l'état du schéma

Pour vérifier que toutes les colonnes nécessaires ont été correctement ajoutées, exécutez :

```
python check_db_schema.py
```

Ce script affichera le schéma actuel des tables `companies` et `pointages` et confirmera la présence des colonnes critiques.

## Problèmes connus

Les problèmes de schéma suivants ont été résolus dans ces migrations :

1. **Colonne manquante : `companies.geolocation_max_accuracy`**
   - Erreur : `(sqlite3.OperationalError) no such column: companies.geolocation_max_accuracy`
   - Solution : Exécuter `run_geolocation_migration.py`

2. **Colonnes manquantes : `pointages.mission_id` et `pointages.mission_order_number`**
   - Erreur : `(sqlite3.OperationalError) no such column: pointages.mission_id`
   - Solution : Exécuter `run_mission_migration.py`

Si d'autres problèmes de schéma sont découverts, créez des scripts de migration supplémentaires en suivant le même modèle.
