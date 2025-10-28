"""Migration pour ajouter la colonne geolocation_max_accuracy aux missions."""

import sqlite3
import os


def run_migration():
    """Ajoute la colonne geolocation_max_accuracy à la table missions si nécessaire."""

    instance_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'instance'
    )
    db_path = os.path.join(instance_path, 'pointflex.db')

    if not os.path.exists(db_path):
        print("Base de données introuvable. Assurez-vous que instance/pointflex.db existe.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(missions)")
    columns = [column[1] for column in cursor.fetchall()]

    if 'geolocation_max_accuracy' not in columns:
        print("Ajout de la colonne geolocation_max_accuracy à la table missions...")
        cursor.execute(
            "ALTER TABLE missions ADD COLUMN geolocation_max_accuracy INTEGER"
        )
        print("Colonne geolocation_max_accuracy ajoutée avec succès.")
    else:
        print("La colonne geolocation_max_accuracy existe déjà dans la table missions.")

    conn.commit()
    conn.close()

    print("Migration terminée avec succès.")


if __name__ == '__main__':
    run_migration()
