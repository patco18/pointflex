# Migrations de base de données

Ce dossier contient les scripts de migration pour gérer les évolutions du schéma de base de données.

## Comment exécuter une migration

```bash
python -m backend.migrations.add_subscription_plan_id
```

## Liste des migrations disponibles

1. `add_subscription_plan_id.py` - Ajoute la colonne subscription_plan_id à la table companies
