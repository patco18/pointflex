#!/usr/bin/env python
"""
Exécutez ce script pour ajouter les colonnes latitude et longitude à la table missions
"""

from backend.migrations.add_mission_geo import run_migration

if __name__ == "__main__":
    print("Exécution de la migration pour ajouter les colonnes de géolocalisation aux missions...")
    run_migration()
    print("Terminé.")
