#!/usr/bin/env python3
"""
Script pour corriger les importations dans les fichiers middleware
"""

import os
import re

def fix_imports_in_file(file_path):
    """Corrige les importations dans un fichier"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Corriger les importations
    content = re.sub(r'from middleware\.', r'from backend.middleware.', content)
    content = re.sub(r'from models\.', r'from backend.models.', content)
    content = re.sub(r'from utils\.', r'from backend.utils.', content)
    content = re.sub(r'from extensions', r'from backend.extensions', content)
    content = re.sub(r'from config import', r'from backend.config import', content)
    content = re.sub(r'from database import', r'from backend.database import', content)
    
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
    # Répertoire middleware
    middleware_dir = os.path.abspath('backend/middleware')
    print(f"Correction des importations dans: {middleware_dir}")
    fix_imports_in_directory(middleware_dir)
    print("Terminé!")
