"""
Script de migration pour ajouter la colonne geolocation_max_accuracy à la table companies
"""

import sqlite3
import os
from backend.config import Config

def run_migration():
    """Exécute la migration pour ajouter la colonne geolocation_max_accuracy"""
    
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
        
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(companies)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'geolocation_max_accuracy' not in column_names:
            # Ajouter la colonne geolocation_max_accuracy avec la valeur par défaut de Config
            default_value = Config.GEOLOCATION_MAX_ACCURACY
            cursor.execute(f"ALTER TABLE companies ADD COLUMN geolocation_max_accuracy INTEGER DEFAULT {default_value}")
            
            # Mettre à jour les valeurs existantes
            cursor.execute(f"UPDATE companies SET geolocation_max_accuracy = {default_value} WHERE geolocation_max_accuracy IS NULL")
            
            print(f"✅ Colonne geolocation_max_accuracy ajoutée avec succès à la table companies avec valeur par défaut {default_value}")
        else:
            print("ℹ️ La colonne geolocation_max_accuracy existe déjà dans la table companies")
        
        # Valider les changements
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        return False

if __name__ == "__main__":
    run_migration()
