"""
Script simplifié pour créer un répertoire symbolic link entre les deux emplacements de base de données
afin qu'ils pointent vers les mêmes fichiers
"""
import os
import shutil

def main():
    # Vérifier que les deux répertoires instance existent
    root_instance = "instance"
    backend_instance = "backend/instance"
    
    # S'assurer que le répertoire backend/instance existe
    if not os.path.exists(backend_instance):
        os.makedirs(backend_instance)
        print(f"✅ Répertoire {backend_instance} créé")
    
    # Copier les fichiers du répertoire racine vers backend/instance
    if os.path.exists(root_instance):
        for file in os.listdir(root_instance):
            source_path = os.path.join(root_instance, file)
            target_path = os.path.join(backend_instance, file)
            
            # Si le fichier est une base de données
            if file.endswith('.db'):
                print(f"Copie de {source_path} vers {target_path}...")
                shutil.copy2(source_path, target_path)
                print(f"✅ Fichier {file} copié avec succès")
    
    print("\nOpération terminée!")

if __name__ == "__main__":
    main()
