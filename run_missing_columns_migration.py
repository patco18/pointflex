#!/usr/bin/env python
"""
Exécutez ce script pour appliquer les migrations manquantes aux tables pointages et offices
"""

from backend.migrations.add_missing_columns import run_migration

if __name__ == "__main__":
    print("Exécution de la migration pour ajouter les colonnes manquantes...")
    run_migration()
    print("Terminé.")
