#!/usr/bin/env python
"""
Script pour générer des clés VAPID pour les notifications Web Push
Exécuter ce script pour créer des nouvelles paires de clés publique/privée
"""

import os
import sys
import json
import base64
from py_vapid import Vapid

def generate_vapid_keys():
    """Generate VAPID keys for Web Push"""
    vapid = Vapid()
    vapid.generate_keys()
    
    # Convertir les clés en base64 d'abord si elles ne sont pas déjà des chaînes
    private_key = vapid.private_key if isinstance(vapid.private_key, str) else vapid.private_key.decode('utf-8')
    public_key = vapid.public_key if isinstance(vapid.public_key, str) else vapid.public_key.decode('utf-8')
    
    # Créer la version URL safe
    public_key_urlsafe = public_key.replace('+', '-').replace('/', '_').replace('=', '')
    
    return {
        "public_key": public_key,
        "private_key": private_key,
        "public_key_urlsafe": public_key_urlsafe,
    }

def save_to_file(keys, filename="vapid_keys.json"):
    """Save generated keys to file"""
    with open(filename, "w") as f:
        json.dump(keys, f, indent=2)
    print(f"Clés VAPID enregistrées dans {filename}")
    
    # Also display in .env format
    print("\nPour .env:")
    print(f"VAPID_PUBLIC_KEY={keys['public_key']}")
    print(f"VAPID_PRIVATE_KEY={keys['private_key']}")
    print(f"VAPID_PUBLIC_KEY_URLSAFE={keys['public_key_urlsafe']}")
    
    # Also display for frontend
    print("\nPour frontend (VITE_VAPID_PUBLIC_KEY):")
    print(keys['public_key_urlsafe'])

def main():
    """Main function to generate VAPID keys"""
    try:
        # Ensure py_vapid is installed
        try:
            from py_vapid import Vapid
        except ImportError:
            print("Module py_vapid non installé. Installation en cours...")
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "py-vapid"])
            print("py-vapid installé avec succès.")
        
        keys = generate_vapid_keys()
        save_to_file(keys)
        
        return 0
    except Exception as e:
        print(f"Erreur: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
