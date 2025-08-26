"""
Script simple pour générer des clés VAPID pour Web Push
"""

import base64
import os
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

# Générer une nouvelle paire de clés
private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()

# Sérialiser la clé privée
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

# Sérialiser la clé publique
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Convertir en format base64 URL-safe pour Web Push
private_b64 = base64.urlsafe_b64encode(
    private_key.private_numbers().private_value.to_bytes(32, byteorder='big')
).decode('utf-8').rstrip('=')

# La clé publique pour Web Push nécessite un format spécifique
x = public_key.public_numbers().x.to_bytes(32, byteorder='big')
y = public_key.public_numbers().y.to_bytes(32, byteorder='big')
public_b64 = base64.urlsafe_b64encode(b'\x04' + x + y).decode('utf-8').rstrip('=')

# Afficher les clés
print("Clés VAPID générées avec succès !")
print("\nConfiguration pour le fichier .env:")
print(f"VAPID_PRIVATE_KEY={private_b64}")
print(f"VAPID_PUBLIC_KEY={public_b64}")
print(f"VAPID_CLAIMS_EMAIL=admin@pointflex.com")

print("\nConfiguration pour le frontend (.env ou .env.local):")
print(f"VITE_VAPID_PUBLIC_KEY={public_b64}")

# Enregistrer les clés dans un fichier
with open("vapid_keys.txt", "w") as f:
    f.write(f"Private Key (base64): {private_b64}\n")
    f.write(f"Public Key (base64): {public_b64}\n")
    f.write(f"Private Key (PEM):\n{private_pem.decode('utf-8')}\n")
    f.write(f"Public Key (PEM):\n{public_pem.decode('utf-8')}\n")

print(f"\nLes clés ont également été sauvegardées dans vapid_keys.txt")
print("IMPORTANT: Ne partagez jamais votre clé privée VAPID et ne la poussez pas sur un dépôt public !")
