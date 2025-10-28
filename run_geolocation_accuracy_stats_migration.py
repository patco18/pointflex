"""Helper script to execute the geolocation accuracy stats migration."""

from backend.migrations.add_geolocation_accuracy_stats import run_migration


if __name__ == '__main__':
    run_migration()
