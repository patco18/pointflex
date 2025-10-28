"""Script d'aide pour lancer la migration des détails de géolocalisation des pointages."""

from backend.migrations.add_pointage_geolocation_details import run_migration


if __name__ == '__main__':
    run_migration()
