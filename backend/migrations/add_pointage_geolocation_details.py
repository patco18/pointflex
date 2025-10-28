"""Migration pour ajouter les détails de géolocalisation aux pointages."""

import sqlite3
import os


def run_migration():
    """Ajoute accuracy, altitude, heading et speed à la table pointages si nécessaire."""

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

    cursor.execute("PRAGMA table_info(pointages)")
    columns = [column[1] for column in cursor.fetchall()]

    additions = [
        ('accuracy', "ALTER TABLE pointages ADD COLUMN accuracy REAL"),
        ('altitude', "ALTER TABLE pointages ADD COLUMN altitude REAL"),
        ('heading', "ALTER TABLE pointages ADD COLUMN heading REAL"),
        ('speed', "ALTER TABLE pointages ADD COLUMN speed REAL"),
    ]

    for name, statement in additions:
        if name not in columns:
            print(f"Ajout de la colonne {name} à la table pointages...")
            cursor.execute(statement)
        else:
            print(f"La colonne {name} existe déjà dans la table pointages.")

    conn.commit()
    conn.close()

    print("Migration terminée avec succès.")


if __name__ == '__main__':
    run_migration()
