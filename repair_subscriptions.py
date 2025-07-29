"""
Script pour diagnostiquer les erreurs de plans d'abonnement
"""
import os
import sys
import json
import traceback

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import db
from backend.app import app
from backend.models.subscription_plan import SubscriptionPlan

def repair_features_format():
    """Réparer le format des fonctionnalités dans tous les plans"""
    with app.app_context():
        print("Diagnostic et réparation des plans d'abonnement...")
        
        # Récupérer tous les plans
        plans = SubscriptionPlan.query.all()
        
        if not plans:
            print("Aucun plan d'abonnement trouvé dans la base de données.")
            return
            
        print(f"Nombre total de plans: {len(plans)}")
        
        for plan in plans:
            print(f"\n--- Plan ID {plan.id}: {plan.name} ({plan.duration_months} mois) ---")
            
            # Vérifier si features est None
            if plan.features is None:
                print(f"   Features est None, correction...")
                plan.features = '[]'
                continue
                
            # Afficher le type et la valeur actuelle
            print(f"   Type de features: {type(plan.features)}")
            print(f"   Valeur de features: {plan.features}")
            
            # Essayer de parser les features si c'est un JSON
            if isinstance(plan.features, str):
                try:
                    features_parsed = json.loads(plan.features)
                    print(f"   JSON valide, contient {len(features_parsed)} fonctionnalités")
                except json.JSONDecodeError as json_error:
                    print(f"   JSON invalide: {json_error}")
                    
                    # Si c'est une simple chaîne, essayer de la convertir en liste
                    if '\n' in plan.features:
                        features_list = [f.strip() for f in plan.features.split('\n') if f.strip()]
                        features_json = json.dumps(features_list)
                        plan.features = features_json
                        print(f"   Converti en liste JSON: {features_json}")
                    else:
                        # Essayer de réparer si c'est une liste Python stringifiée
                        try:
                            # Essayer d'interpréter comme une liste Python (dangereux en prod!)
                            import ast
                            features_list = ast.literal_eval(plan.features)
                            if isinstance(features_list, list):
                                features_json = json.dumps(features_list)
                                plan.features = features_json
                                print(f"   Converti en JSON: {features_json}")
                            else:
                                plan.features = '[]'
                                print("   Impossible de convertir, réinitialisé à liste vide")
                        except:
                            plan.features = '[]'
                            print("   Impossible de convertir, réinitialisé à liste vide")
        
        # Appliquer les modifications
        try:
            db.session.commit()
            print("\nModifications sauvegardées avec succès!")
        except Exception as e:
            db.session.rollback()
            print(f"\nErreur lors de la sauvegarde: {e}")
            print(traceback.format_exc())

if __name__ == "__main__":
    repair_features_format()
