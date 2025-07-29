"""
Script de diagnostic pour la base de données
"""

from backend.app import create_app
import os
import sqlite3

def run_diagnostics():
    """Exécute des diagnostics sur la base de données"""
    print("\n=== DIAGNOSTIC DE BASE DE DONNÉES ===\n")
    
    # 1. Information sur le répertoire courant
    cwd = os.getcwd()
    print(f"Répertoire courant: {cwd}")
    print(f"Fichiers dans le répertoire courant: {os.listdir()}")
    
    # Vérifier tous les fichiers .db dans le répertoire courant et ses sous-répertoires
    print("\nRecherche de fichiers .db dans le répertoire et les sous-répertoires:")
    for root, dirs, files in os.walk("."):
        for file in files:
            if file.endswith(".db"):
                full_path = os.path.join(root, file)
                size = os.path.getsize(full_path)
                print(f"- {full_path} ({size} octets)")
                
                # Si le fichier a une taille non nulle, essayer de le lire
                if size > 0:
                    try:
                        conn = sqlite3.connect(full_path)
                        cursor = conn.cursor()
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                        tables = cursor.fetchall()
                        print(f"  Tables: {[t[0] for t in tables]}")
                        conn.close()
                    except sqlite3.Error as e:
                        print(f"  Erreur lors de la lecture: {e}")
    
    # 2. Vérifier le dossier instance
    if os.path.exists('instance'):
        print(f"\nDossier instance trouvé: {os.path.abspath('instance')}")
        print(f"Contenu du dossier instance: {os.listdir('instance')}")
    else:
        print("\nDossier instance non trouvé")
    
    # 3. Obtenir les informations de configuration
    try:
        app = create_app()
        db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        print(f"\nURI de base de données configurée: {db_uri}")
        
        # 4. Essayer de se connecter à la base de données
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            if db_path == 'pointflex.db':
                # Essayer différents emplacements possibles
                possible_paths = [
                    'pointflex.db',
                    'instance/pointflex.db',
                    '../instance/pointflex.db',
                    '../pointflex.db'
                ]
                
                for path in possible_paths:
                    full_path = os.path.abspath(path)
                    if os.path.exists(path):
                        print(f"\nBase de données trouvée: {path} ({full_path})")
                        try:
                            conn = sqlite3.connect(path)
                            cursor = conn.cursor()
                            
                            # Lister les tables
                            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                            tables = cursor.fetchall()
                            print(f"Tables dans la base de données: {[t[0] for t in tables]}")
                            
                            # Pour chaque table, obtenir les colonnes
                            print("\nSchéma des tables principales:")
                            for table in ['companies', 'users', 'subscription_plans']:
                                try:
                                    cursor.execute(f"PRAGMA table_info({table})")
                                    columns = cursor.fetchall()
                                    if columns:
                                        print(f"\n- Table {table}:")
                                        for col in columns:
                                            print(f"  - {col[1]} ({col[2]})")
                                except sqlite3.Error as e:
                                    print(f"  Erreur avec la table {table}: {e}")
                            
                            conn.close()
                            print("\nConnexion réussie et fermée")
                        except sqlite3.Error as e:
                            print(f"Erreur de connexion à {path}: {e}")
                    else:
                        print(f"\nChemin testé mais non trouvé: {path} ({full_path})")
        
    except Exception as e:
        print(f"\nErreur lors du diagnostic: {e}")
    
    print("\n=== FIN DU DIAGNOSTIC ===\n")

if __name__ == "__main__":
    run_diagnostics()
