"""
Script de migration pour ajouter les champs de subscription Web Push à la table push_subscriptions
"""

import sqlite3
import os

def run_migration():
    """Exécute la migration pour ajouter les colonnes Web Push"""
    
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
        cursor.execute("PRAGMA table_info(push_subscriptions)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        # Ajouter la colonne subscription_json si elle n'existe pas
        if 'subscription_json' not in column_names:
            cursor.execute("ALTER TABLE push_subscriptions ADD COLUMN subscription_json TEXT")
            print("✅ Colonne subscription_json ajoutée avec succès à la table push_subscriptions")
        else:
            print("ℹ️ La colonne subscription_json existe déjà dans la table push_subscriptions")
        
        # Ajouter la colonne endpoint si elle n'existe pas
        if 'endpoint' not in column_names:
            cursor.execute("ALTER TABLE push_subscriptions ADD COLUMN endpoint TEXT")
            print("✅ Colonne endpoint ajoutée avec succès à la table push_subscriptions")
        else:
            print("ℹ️ La colonne endpoint existe déjà dans la table push_subscriptions")
        
        # Créer un index sur endpoint pour des recherches plus rapides
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)")
            print("✅ Index sur endpoint créé avec succès")
        except sqlite3.OperationalError as e:
            if "already exists" in str(e):
                print("ℹ️ L'index sur endpoint existe déjà")
            else:
                raise
        
        # Valider les changements
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        return False

if __name__ == "__main__":
    run_migration()
