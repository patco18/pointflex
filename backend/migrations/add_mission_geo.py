"""
Migration pour ajouter les colonnes latitude et longitude à la table missions
si elles n'existent pas déjà.
"""

import sqlite3
import os

def run_migration():
    """
    Ajoute les colonnes latitude et longitude à la table missions
    """
    # Trouver le chemin de l'instance
    instance_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance')
    db_path = os.path.join(instance_path, 'pointflex.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Vérifier si les colonnes existent déjà
    cursor.execute("PRAGMA table_info(missions)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'latitude' not in columns:
        print("Ajout de la colonne latitude à la table missions...")
        cursor.execute("ALTER TABLE missions ADD COLUMN latitude FLOAT")
        print("Colonne latitude ajoutée avec succès.")
    else:
        print("La colonne latitude existe déjà dans la table missions.")
        
    if 'longitude' not in columns:
        print("Ajout de la colonne longitude à la table missions...")
        cursor.execute("ALTER TABLE missions ADD COLUMN longitude FLOAT")
        print("Colonne longitude ajoutée avec succès.")
    else:
        print("La colonne longitude existe déjà dans la table missions.")
        
    if 'radius' not in columns:
        print("Ajout de la colonne radius à la table missions...")
        cursor.execute("ALTER TABLE missions ADD COLUMN radius INTEGER")
        print("Colonne radius ajoutée avec succès.")
    else:
        print("La colonne radius existe déjà dans la table missions.")
    
    conn.commit()
    conn.close()
    
    print("Migration terminée avec succès.")

if __name__ == "__main__":
    run_migration()
