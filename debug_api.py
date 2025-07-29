"""
Script pour tester directement l'API des plans d'abonnement
"""
import requests
import json
import sys
import os
import time

# URL de base de l'API
BASE_URL = "http://127.0.0.1:5000/api"  # URL locale avec IP explicite au lieu de localhost

def test_debug_route():
    """Tester la route de débogage des plans"""
    print("\n--- Test de la route de débogage ---")
    try:
        response = requests.get(f"{BASE_URL}/subscription/debug/plans")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Nombre de plans: {len(data.get('plans', []))}")
            print("Premier plan (si existe):")
            if data.get('plans'):
                print(json.dumps(data['plans'][0], indent=2))
        else:
            print(f"Erreur: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

def test_auth_route():
    """Tester la route authentifiée des plans"""
    print("\n--- Test de la route authentifiée ---")
    
    # Essayer d'obtenir un token (simuler une connexion)
    try:
        # Remplacez par des identifiants de test valides
        auth_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "superadmin@pointflex.com", 
            "password": "superadmin123"
        })
        
        if auth_response.status_code != 200:
            print(f"Échec de l'authentification: {auth_response.status_code}")
            print(auth_response.text)
            return
            
        token = auth_response.json().get('token')
        if not token:
            print("Token non trouvé dans la réponse d'authentification")
            return
            
        print("Authentification réussie, token obtenu")
        print(f"Token: {token[:20]}...{token[-10:]}")
        
        # Attendre un peu pour s'assurer que le token est bien enregistré
        time.sleep(1)
        
        # Maintenant tester la route des plans avec authentification
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Headers: {headers}")
        response = requests.get(f"{BASE_URL}/subscription/plans", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Nombre de plans: {len(data.get('plans', []))}")
            print("Premier plan (si existe):")
            if data.get('plans'):
                print(json.dumps(data['plans'][0], indent=2))
        else:
            print(f"Erreur: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")
        
if __name__ == "__main__":
    print("=== Diagnostic de l'API des plans d'abonnement ===")
    test_debug_route()
    test_auth_route()
