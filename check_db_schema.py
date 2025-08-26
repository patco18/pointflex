"""
Script de vérification qui affiche le schéma actuel de la base de données
pour les tables qui ont posé des problèmes
"""

import sqlite3
import os
import sys
import json

# Ajouter le répertoire parent au chemin Python pour pouvoir importer depuis backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

def check_schema():
    """Vérifie le schéma de la base de données pour les tables problématiques"""
    
    # Chemin de la base de données
    db_path = os.path.join('backend', 'instance', 'pointflex.db')
    
    if not os.path.exists(db_path):
        print(f"Base de données introuvable à {db_path}")
        return False
    
    try:
        # Connexion à la base de données
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Tables à vérifier
        tables = ['companies', 'pointages']
        
        # Stocker les résultats
        schema_info = {}
        
        for table in tables:
            # Obtenir les informations sur les colonnes de la table
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            
            # Format des colonnes retournées par PRAGMA table_info:
            # (id, name, type, notnull, default_value, pk)
            
            schema_info[table] = [{
                "id": col[0],
                "name": col[1],
                "type": col[2],
                "not_null": bool(col[3]),
                "default": col[4],
                "primary_key": bool(col[5])
            } for col in columns]
        
        # Afficher les résultats
        print("\n====== SCHÉMA ACTUEL DE LA BASE DE DONNÉES ======\n")
        
        for table, columns in schema_info.items():
            print(f"\nTable: {table}")
            print("-" * 60)
            print(f"{'ID':<3} | {'Nom':<25} | {'Type':<10} | {'Not Null':<8} | {'Default':<15} | {'PK'}")
            print("-" * 60)
            
            # Vérification des colonnes critiques
            critical_columns = {
                'companies': ['geolocation_max_accuracy'],
                'pointages': ['mission_id', 'mission_order_number']
            }
            
            # Lister toutes les colonnes
            for col in columns:
                pk = "✓" if col["primary_key"] else ""
                nn = "✓" if col["not_null"] else ""
                default = str(col["default"]) if col["default"] is not None else ""
                print(f"{col['id']:<3} | {col['name']:<25} | {col['type']:<10} | {nn:<8} | {default:<15} | {pk}")
            
            # Vérifier si les colonnes critiques existent
            column_names = [col["name"] for col in columns]
            missing = [col for col in critical_columns.get(table, []) if col not in column_names]
            
            if missing:
                print(f"\n⚠️ ATTENTION: Les colonnes suivantes sont toujours manquantes: {', '.join(missing)}")
            else:
                print(f"\n✅ Toutes les colonnes critiques sont présentes dans la table {table}")
        
        conn.close()
        return True
    
    except Exception as e:
        print(f"Erreur lors de la vérification du schéma: {str(e)}")
        return False

if __name__ == "__main__":
    check_schema()
