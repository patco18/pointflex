"""
Script rapide pour vérifier les plans d'abonnement directement dans la base de données
"""
import os
import json
import sqlite3

def main():
    # Essayer plusieurs chemins possibles
    db_paths = [
        'backend/instance/pointflex.db',
        'backend/instance/pointflex1.db',
        'instance/pointflex.db',
        'pointflex.db'
    ]
    
    for db_path in db_paths:
        check_db(db_path)

def check_db(db_path):
    print(f"Tentative de connexion à: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subscription_plans")
        
        plans = cursor.fetchall()
        print(f"Plans trouvés: {len(plans)}")
        
        if plans:
            plan = dict(plans[0])
            print(f"\nPremier plan:")
            for key, value in plan.items():
                if key == 'features' and value:
                    try:
                        features = json.loads(value)
                        print(f" - {key}: {features}")
                    except Exception as e:
                        print(f" - {key}: Erreur JSON ({e}): {value}")
                else:
                    print(f" - {key}: {value}")
                    
        conn.close()
    except Exception as e:
        print(f"Erreur: {e}")

def main():
    # Essayer plusieurs chemins possibles
    db_paths = [
        'backend/instance/pointflex.db',
        'backend/instance/pointflex1.db',
        'instance/pointflex.db',
        'pointflex.db'
    ]
    
    for db_path in db_paths:
        check_db(db_path)

if __name__ == "__main__":
    main()
