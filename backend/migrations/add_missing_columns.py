"""
Migration pour ajouter les colonnes manquantes device_id à la table pointages
et geolocation_max_accuracy à la table offices
"""

import sqlite3
import os

def run_migration():
    """
    Ajoute les colonnes device_id à la table pointages
    et geolocation_max_accuracy à la table offices
    """
    # Trouver le chemin de l'instance
    instance_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance')
    db_path = os.path.join(instance_path, 'pointflex.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Vérifier si la colonne device_id existe dans la table pointages
    cursor.execute("PRAGMA table_info(pointages)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'device_id' not in columns:
        print("Ajout de la colonne device_id à la table pointages...")
        cursor.execute("ALTER TABLE pointages ADD COLUMN device_id TEXT")
        print("Colonne device_id ajoutée avec succès.")
    else:
        print("La colonne device_id existe déjà dans la table pointages.")
    
    # Vérifier si la colonne geolocation_max_accuracy existe dans la table offices
    cursor.execute("PRAGMA table_info(offices)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'geolocation_max_accuracy' not in columns:
        print("Ajout de la colonne geolocation_max_accuracy à la table offices...")
        cursor.execute("ALTER TABLE offices ADD COLUMN geolocation_max_accuracy FLOAT DEFAULT 100")
        print("Colonne geolocation_max_accuracy ajoutée avec succès.")
    else:
        print("La colonne geolocation_max_accuracy existe déjà dans la table offices.")
    
    conn.commit()
    conn.close()
    
    print("Migration terminée avec succès.")

if __name__ == "__main__":
    run_migration()
