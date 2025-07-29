"""
Script pour ajouter la colonne subscription_plan_id à la table companies
"""

from backend.app import create_app
from backend.database import db
import traceback
import sqlite3
import os

def create_subscription_plan_id_column():
    """Ajoute la colonne subscription_plan_id à la table companies"""
    try:
        # Utiliser directement le chemin spécifié pour la base de données
        db_path = "D:\\PROJET SAAS\\tests\\pointflex-15\\backend\\instance\\pointflex.db"
        print(f"Utilisation du chemin direct de la base de données: {db_path}")
        
        # Vérifier que le fichier existe
        if not os.path.exists(db_path):
            print(f"ERREUR: Le fichier de base de données {db_path} n'existe pas!")
            raise FileNotFoundError(f"Base de données introuvable: {db_path}")
            
        # Connecter à la base de données SQLite directement
        print(f"Connexion à la base de données: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Lister les tables pour diagnostic
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"Tables dans la base de données: {[t[0] for t in tables]}")
        
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(companies)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'subscription_plan_id' in column_names:
            print("La colonne subscription_plan_id existe déjà dans la table companies.")
            return
        
        print("Ajout de la colonne subscription_plan_id à la table companies...")
        
        # Ajouter la colonne
        cursor.execute("ALTER TABLE companies ADD COLUMN subscription_plan_id INTEGER REFERENCES subscription_plans(id)")
        
        # Valider les modifications
        conn.commit()
        print("Colonne ajoutée avec succès!")
        
        # Fermer la connexion
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Erreur lors de la création de la colonne: {str(e)}")
        print(traceback.format_exc())
        raise

if __name__ == "__main__":
    create_subscription_plan_id_column()
