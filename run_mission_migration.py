"""
Script pour exécuter la migration add_mission_columns
"""

from backend.migrations.add_mission_columns import run_migration

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("✅ Migration terminée avec succès")
    else:
        print("❌ Échec de la migration")
