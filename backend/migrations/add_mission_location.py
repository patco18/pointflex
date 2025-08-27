"""
Migration pour ajouter la colonne location à la table missions
"""

import sqlite3
import os

def run_migration():
    """
    Ajoute la colonne location à la table missions
    """
    # Trouver le chemin de l'instance
    instance_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance')
    db_path = os.path.join(instance_path, 'pointflex.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Vérifier si la colonne location existe dans la table missions
    cursor.execute("PRAGMA table_info(missions)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'location' not in columns:
        print("Ajout de la colonne location à la table missions...")
        cursor.execute("ALTER TABLE missions ADD COLUMN location TEXT")
        print("Colonne location ajoutée avec succès.")
    else:
        print("La colonne location existe déjà dans la table missions.")
    
    conn.commit()
    conn.close()
    
    print("Migration terminée avec succès.")

if __name__ == "__main__":
    run_migration()
