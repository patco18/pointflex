import os

# Chemin du fichier à corriger
file_path = "D:/PROJET SAAS/tests/pointflex-15/backend/tasks/webhook_tasks.py"

# Lire les 203 premières lignes du fichier
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()[:203]

# Écrire les 203 premières lignes et ajouter les commentaires propres
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
    f.write('\n# Key Considerations for this Task File:\n')
    f.write('# -  Flask App Context in RQ Worker: This is critical for webhook_tasks.py\n')
    f.write('# -  Imports are placed inside the task function for proper context\n')
    f.write('# -  Retry Logic included with support from RQ\n')
    f.write('# -  Error Handling for requests is included\n')

print("Fichier corrigé avec succès!")
