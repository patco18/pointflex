"""
Script pour vérifier la configuration de la base de données
"""
import os
import sys

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.app import app
    from backend.database import db
    from backend.models.subscription_plan import SubscriptionPlan
except ImportError as e:
    print(f"Erreur d'importation des modules: {e}")
    sys.exit(1)

with app.app_context():
    # Afficher l'URI de la base de données
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    print(f"URI de la base de données configurée: {db_uri}")
    
    # Vérifier le chemin de la base de données
    if db_uri and 'sqlite:///' in db_uri:
        db_path = db_uri.replace('sqlite:///', '')
        print(f"Chemin de la base de données SQLite: {db_path}")
        
        # Vérifier si le fichier existe
        if os.path.exists(db_path):
            print(f"✅ Le fichier de base de données existe à {db_path}")
            print(f"Taille du fichier: {os.path.getsize(db_path)} octets")
        else:
            print(f"❌ Le fichier de base de données n'existe PAS à {db_path}")
    else:
        print("La base de données n'est pas SQLite ou l'URI est mal configuré")
    
    # Tester la connexion à la base de données
    try:
        result = db.session.execute(db.text("SELECT 1")).scalar()
        print(f"✅ Connexion à la base de données réussie: {result}")
    except Exception as e:
        print(f"❌ Erreur de connexion à la base de données: {e}")
    
    # Vérifier les plans d'abonnement
    try:
        count = SubscriptionPlan.query.count()
        print(f"Nombre de plans dans la base de données (via ORM): {count}")
        
        if count > 0:
            plans = SubscriptionPlan.query.all()
            print("\nListe des plans:")
            for plan in plans:
                print(f" - {plan.id}: {plan.name} ({plan.duration_months} mois) à {plan.price}€")
    except Exception as e:
        print(f"❌ Erreur lors de la requête sur les plans d'abonnement: {e}")
