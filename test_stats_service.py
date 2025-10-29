"""
Script pour tester le service de statistiques de manière isolée
"""

import os
import sys
import json

# Ajouter le chemin du projet pour les imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Configuration pour que l'app soit chargée correctement
from flask import Flask
app = Flask(__name__)
default_db_url = 'postgresql+psycopg://pointflex:pointflex@localhost:5432/pointflex'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', default_db_url)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialiser la base de données
from backend.database import db
db.init_app(app)

def test_stats_services():
    """Teste les fonctions de statistiques en isolation"""
    with app.app_context():
        from backend.services.superadmin_stats_service import get_global_stats_safe, get_subscription_stats_safe
        
        print("\n===== TEST DU SERVICE DE STATISTIQUES GLOBALES =====")
        try:
            global_stats = get_global_stats_safe()
            print(json.dumps(global_stats, indent=2, default=str))
            print("\n✅ Test de get_global_stats_safe réussi")
        except Exception as e:
            print(f"\n❌ Erreur lors du test de get_global_stats_safe: {e}")
        
        print("\n===== TEST DU SERVICE DE STATISTIQUES D'ABONNEMENT =====")
        try:
            subscription_stats = get_subscription_stats_safe()
            print(json.dumps(subscription_stats, indent=2, default=str))
            print("\n✅ Test de get_subscription_stats_safe réussi")
        except Exception as e:
            print(f"\n❌ Erreur lors du test de get_subscription_stats_safe: {e}")

if __name__ == "__main__":
    test_stats_services()
