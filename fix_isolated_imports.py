#!/usr/bin/env python3
"""
Script pour corriger les importations 'extensions' isolées
"""

import os
import re

def fix_imports_in_file(file_path):
    """Corrige les importations isolées"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Corriger les importations isolées (qui ne font pas partie de from X import Y)
    content = re.sub(r'from extensions ', r'from backend.extensions ', content)
    content = re.sub(r'from config ', r'from backend.config ', content)
    content = re.sub(r'from database ', r'from backend.database ', content)
    content = re.sub(r'import extensions', r'import backend.extensions as extensions', content)
    content = re.sub(r'import config', r'import backend.config as config', content)
    content = re.sub(r'import database', r'import backend.database as database', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fichier corrigé: {file_path}")

def fix_imports_in_directory(directory):
    """Corrige les importations dans tous les fichiers Python d'un répertoire"""
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                fix_imports_in_file(file_path)

if __name__ == "__main__":
    # Tous les répertoires dans backend
    backend_dir = os.path.abspath('backend')
    print(f"Correction des importations dans: {backend_dir}")
    fix_imports_in_directory(backend_dir)
    print("Terminé!")
