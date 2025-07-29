"""
Script pour comparer les plans d'abonnement dans les différentes bases de données
"""
import os
import sqlite3
import json

def check_plans_in_db(db_path):
    """Vérifie les plans d'abonnement dans la base de données"""
    print(f"\n=== Vérification de {db_path} ===")
    
    if not os.path.exists(db_path):
        print(f"❌ Fichier non trouvé: {db_path}")
        return
        
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Vérifier si la table existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='subscription_plans'")
        if not cursor.fetchone():
            print("❌ Table subscription_plans non trouvée!")
            return
            
        # Compter les plans
        cursor.execute("SELECT COUNT(*) as count FROM subscription_plans")
        count = cursor.fetchone()['count']
        print(f"Nombre de plans: {count}")
        
        if count > 0:
            # Récupérer un exemple
            cursor.execute("SELECT * FROM subscription_plans LIMIT 1")
            plan = dict(cursor.fetchone())
            
            print("\nExemple de plan:")
            print(f" - ID: {plan.get('id')}")
            print(f" - Nom: {plan.get('name')}")
            print(f" - Prix: {plan.get('price')}€")
            
            # Vérifier les features
            if plan.get('features'):
                try:
                    features = json.loads(plan['features'])
                    print(f" - Features: {features}")
                except Exception as e:
                    print(f" - Features (erreur): {e}")
        
        conn.close()
    except Exception as e:
        print(f"❌ Erreur: {e}")

def main():
    """Fonction principale"""
    db_paths = [
        "instance/pointflex.db",
        "backend/instance/pointflex.db"
    ]
    
    for path in db_paths:
        check_plans_in_db(path)

if __name__ == "__main__":
    main()
