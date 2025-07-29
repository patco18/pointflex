"""
Script pour réinitialiser la base de données
"""
import os
import sys

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import db
from backend.app import app

with app.app_context():
    print("Suppression des tables existantes...")
    db.drop_all()
    
    print("Création des nouvelles tables...")
    db.create_all()
    
    print("Base de données réinitialisée avec succès.")
