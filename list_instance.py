"""
Script pour lister les fichiers de base de données
"""
import os

def main():
    print(f"Répertoire courant: {os.getcwd()}")
    
    # Lister les fichiers dans le répertoire instance
    instance_path = "instance"
    if os.path.exists(instance_path):
        print(f"\nFichiers dans {instance_path}:")
        for f in os.listdir(instance_path):
            fpath = os.path.join(instance_path, f)
            print(f"  - {f} ({os.path.getsize(fpath)} octets)")
    else:
        print(f"\nLe répertoire {instance_path} n'existe pas")
        
    # Lister les fichiers dans le répertoire backend/instance
    backend_instance_path = os.path.join("backend", "instance")
    if os.path.exists(backend_instance_path):
        print(f"\nFichiers dans {backend_instance_path}:")
        for f in os.listdir(backend_instance_path):
            fpath = os.path.join(backend_instance_path, f)
            print(f"  - {f} ({os.path.getsize(fpath)} octets)")
    else:
        print(f"\nLe répertoire {backend_instance_path} n'existe pas")
        
if __name__ == "__main__":
    main()
