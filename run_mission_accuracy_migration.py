#!/usr/bin/env python
"""Exécute la migration ajoutant geolocation_max_accuracy aux missions."""

from backend.migrations.add_mission_accuracy import run_migration


if __name__ == "__main__":
    print("Exécution de la migration pour ajouter geolocation_max_accuracy aux missions...")
    run_migration()
    print("Terminé.")
