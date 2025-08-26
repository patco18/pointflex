"""
Script de migration pour ajouter les colonnes mission_id et mission_order_number à la table pointages
"""

import sqlite3
import os

def run_migration():
    """Exécute la migration pour ajouter les colonnes liées aux missions dans la table pointages"""
    
    # Chemin de la base de données (relatif à l'emplacement du script)
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'pointflex.db')
    
    # Vérifier que la base de données existe
    if not os.path.exists(db_path):
        print(f"Base de données introuvable à {db_path}")
        return False
    
    try:
        # Connexion à la base de données
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Vérifier si les colonnes existent déjà
        cursor.execute("PRAGMA table_info(pointages)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        changes_made = False
        
        # Ajouter la colonne mission_id si elle n'existe pas
        if 'mission_id' not in column_names:
            cursor.execute("ALTER TABLE pointages ADD COLUMN mission_id INTEGER")
            print("✅ Colonne mission_id ajoutée avec succès à la table pointages")
            changes_made = True
            
        # Ajouter la colonne mission_order_number si elle n'existe pas
        if 'mission_order_number' not in column_names:
            cursor.execute("ALTER TABLE pointages ADD COLUMN mission_order_number VARCHAR(100)")
            print("✅ Colonne mission_order_number ajoutée avec succès à la table pointages")
            changes_made = True
            
        if not changes_made:
            print("ℹ️ Les colonnes de mission existent déjà dans la table pointages")
        
        # Valider les changements
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        return False

if __name__ == "__main__":
    run_migration()
