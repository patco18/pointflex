"""
Script pour ajouter directement la colonne subscription_plan_id à la table companies via SQLite
"""

import sqlite3
import os
import click

def add_column_directly():
    """Ajoute directement la colonne à la table companies dans SQLite"""
    try:
        # Obtenez le chemin absolu du fichier de base de données
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(current_dir, "instance", "pointflex.db")
        
        # Affichage adapté selon l'environnement d'exécution (CLI Flask ou script direct)
        if click:
            output_func = click.echo
        else:
            output_func = print
            
        output_func(f"Utilisation de la base de données: {db_path}")
        
        # Vérifier que le fichier existe
        if not os.path.exists(db_path):
            output_func(f"ERREUR: Le fichier de base de données {db_path} n'existe pas!")
            return False
        
        # Connecter à la base de données SQLite directement
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(companies)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'subscription_plan_id' in column_names:
            output_func("La colonne subscription_plan_id existe déjà.")
            cursor.close()
            conn.close()
            return True
        
        output_func("Ajout de la colonne subscription_plan_id à la table companies...")
        
        # Exécuter directement la commande ALTER TABLE
        cursor.execute("ALTER TABLE companies ADD COLUMN subscription_plan_id INTEGER REFERENCES subscription_plans(id)")
        conn.commit()
        
        # Vérifier que la colonne a bien été ajoutée
        cursor.execute("PRAGMA table_info(companies)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'subscription_plan_id' in column_names:
            output_func("✅ Colonne subscription_plan_id ajoutée avec succès!")
            status = True
        else:
            output_func("❌ Échec de l'ajout de la colonne.")
            status = False
        
        # Fermer la connexion
        cursor.close()
        conn.close()
        return status
        
    except Exception as e:
        output_func = click.echo if click else print
        output_func(f"Erreur: {e}")
        import traceback
        output_func(traceback.format_exc())
        return False

if __name__ == "__main__":
    add_column_directly()
