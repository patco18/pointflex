"""
Script pour exécuter la migration add_geolocation_max_accuracy
"""

from backend.migrations.add_geolocation_max_accuracy import run_migration

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("✅ Migration terminée avec succès")
    else:
        print("❌ Échec de la migration")
