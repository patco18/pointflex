#!/usr/bin/env python
"""
Exécutez ce script pour ajouter la colonne location à la table missions
"""

from backend.migrations.add_mission_location import run_migration

if __name__ == "__main__":
    print("Exécution de la migration pour ajouter la colonne location à la table missions...")
    run_migration()
    print("Terminé.")
