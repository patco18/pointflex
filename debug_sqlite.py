"""
Script pour vérifier directement la base de données SQLite
"""
import os
import sqlite3
import json
import sys

def main():
    """Fonction principale"""
    # Trouver le chemin de la base de données
    db_path = os.path.join('instance', 'database.sqlite')
    
    if not os.path.exists(db_path):
        print(f"Base de données non trouvée à {os.path.abspath(db_path)}")
        # Chercher dans d'autres endroits courants
        possible_paths = [
            'backend/instance/pointflex.db',
            'backend/instance/pointflex1.db',
            'database.sqlite',
            '../instance/database.sqlite',
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                db_path = path
                print(f"Base de données trouvée à {os.path.abspath(db_path)}")
                break
        else:
            print("Base de données introuvable")
            return
    
    # Connexion à la base de données SQLite
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Lister les tables
        print("\n=== TABLES DE LA BASE DE DONNÉES ===")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = cursor.fetchall()
        
        for table in tables:
            print(f"- {table['name']}")
        
        # Vérifier spécifiquement la table subscription_plans
        print("\n=== STRUCTURE DE LA TABLE SUBSCRIPTION_PLANS ===")
        try:
            cursor.execute("PRAGMA table_info(subscription_plans);")
            columns = cursor.fetchall()
            
            for col in columns:
                print(f"- {col['name']}: {col['type']}")
                
            # Vérifier le contenu de la table
            print("\n=== CONTENU DE LA TABLE SUBSCRIPTION_PLANS ===")
            cursor.execute("SELECT COUNT(*) as count FROM subscription_plans;")
            count = cursor.fetchone()['count']
            print(f"Nombre de plans: {count}")
            
            if count > 0:
                cursor.execute("SELECT * FROM subscription_plans;")
                plans = cursor.fetchall()
                
                for plan in plans:
                    plan_dict = dict(plan)
                    print(f"\nPlan ID: {plan_dict['id']}")
                    print(f"Nom: {plan_dict['name']}")
                    print(f"Prix: {plan_dict['price']}")
                    print(f"Durée (mois): {plan_dict['duration_months']}")
                    
                    # Analyser le champ features
                    if plan_dict.get('features'):
                        print("Features (brut):", plan_dict['features'][:50], "..." if len(plan_dict['features']) > 50 else "")
                        try:
                            features = json.loads(plan_dict['features'])
                            print(f"Features (parsé): {features}")
                        except json.JSONDecodeError as e:
                            print(f"Erreur parsing JSON: {e}")
            else:
                print("Aucun plan trouvé dans la base de données")
                
        except sqlite3.OperationalError as e:
            print(f"Erreur lors de la lecture de la table subscription_plans: {e}")
        
    except Exception as e:
        print(f"Erreur lors de l'accès à la base de données: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
