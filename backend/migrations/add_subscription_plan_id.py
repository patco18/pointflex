"""
Script de migration pour ajouter la colonne subscription_plan_id à la table companies
"""

import sqlite3
import os

def run_migration():
    """Exécute la migration pour ajouter la colonne subscription_plan_id"""
    
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
        
        if 'subscription_plan_id' not in column_names:
            # Ajouter la colonne subscription_plan_id
            cursor.execute("ALTER TABLE companies ADD COLUMN subscription_plan_id INTEGER")
            print("✅ Colonne subscription_plan_id ajoutée avec succès à la table companies")
        else:
            print("ℹ️ La colonne subscription_plan_id existe déjà dans la table companies")
            
        # Faire correspondre les subscription_plan_id avec les noms de plan
        # Note: Cela suppose qu'il y a une table subscription_plans
        print("Mise à jour des subscription_plan_id basé sur les noms de plans...")
        
        # D'abord vérifier que la table subscription_plans existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='subscription_plans'")
        if cursor.fetchone():
            # Mettre à jour pour le plan basic
            cursor.execute("""
                UPDATE companies
                SET subscription_plan_id = (
                    SELECT id FROM subscription_plans WHERE name = 'basic' LIMIT 1
                )
                WHERE subscription_plan = 'basic'
            """)
            
            # Mettre à jour pour le plan premium
            cursor.execute("""
                UPDATE companies
                SET subscription_plan_id = (
                    SELECT id FROM subscription_plans WHERE name = 'premium' LIMIT 1
                )
                WHERE subscription_plan = 'premium'
            """)
            
            # Mettre à jour pour le plan enterprise
            cursor.execute("""
                UPDATE companies
                SET subscription_plan_id = (
                    SELECT id FROM subscription_plans WHERE name = 'enterprise' LIMIT 1
                )
                WHERE subscription_plan = 'enterprise'
            """)
            
            print("✅ Mise à jour des IDs de plan terminée")
        else:
            print("⚠️ La table subscription_plans n'existe pas, impossible de mettre à jour les IDs")
        
        # Valider les changements
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        return False

if __name__ == "__main__":
    run_migration()
