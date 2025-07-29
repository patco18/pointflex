#!/usr/bin/env python3
"""
Script de migration pour ajouter les nouveaux champs au modèle Pointage
"""

from flask import Flask
import sqlalchemy as sa
from sqlalchemy import inspect, text
from sqlalchemy.exc import NoSuchTableError
import sys
import os

# Ajouter le répertoire parent au chemin Python
sys.path.insert(0, os.path.abspath('.'))

from backend.database import db
from backend.config import Config
from backend.models.pointage import Pointage
from backend.models.user import User

# Créer une mini-application Flask pour le contexte de base de données
app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

def check_table_exists(engine, table_name):
    """Vérifie si une table existe dans la base de données"""
    with engine.connect() as conn:
        try:
            inspector = inspect(engine)
            return table_name in inspector.get_table_names()
        except:
            return False

def add_column_if_not_exists(engine, table_name, column):
    """Ajoute une colonne à une table si elle n'existe pas déjà"""
    if not check_table_exists(engine, table_name):
        print(f"La table {table_name} n'existe pas. Initialisation de toutes les tables...")
        with app.app_context():
            db.create_all()
        print(f"Tables créées avec succès!")
        return

    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        
        if column.name not in columns:
            print(f"Ajout de la colonne {column.name} à la table {table_name}")
            column_type = column.type.compile(engine.dialect)
            nullable = "" if column.nullable else " NOT NULL"
            
            # Gestion des valeurs par défaut
            default = ""
            if column.default is not None and hasattr(column.default, 'arg') and column.default.arg is not None:
                if isinstance(column.default.arg, bool):
                    default_val = "1" if column.default.arg else "0"
                    default = f" DEFAULT {default_val}"
                else:
                    default = f" DEFAULT '{column.default.arg}'"
            
            # Gestion des clés étrangères
            fk_clause = ""
            if hasattr(column, 'foreign_keys') and column.foreign_keys:
                for fk in column.foreign_keys:
                    target_table = fk.target_fullname.split('.')[0]
                    target_col = fk.target_fullname.split('.')[1]
                    fk_clause = f" REFERENCES {target_table}({target_col})"
            
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}{nullable}{default}{fk_clause}"))
        else:
            print(f"La colonne {column.name} existe déjà dans la table {table_name}")

def run_migration():
    """Exécute la migration pour ajouter les nouveaux champs au modèle Pointage"""
    with app.app_context():
        engine = db.engine
        table_name = Pointage.__tablename__
        
        # Vérifier si la table existe, sinon la créer
        if not check_table_exists(engine, table_name):
            print(f"La table {table_name} n'existe pas. Initialisation de la base de données...")
            db.create_all()
            print("Base de données initialisée avec succès!")
            return
        
        print(f"La table {table_name} existe. Ajout des nouvelles colonnes...")
        
        # Liste des nouvelles colonnes à ajouter
        new_columns = [
            sa.Column('geo_latitude', sa.Float, nullable=True),
            sa.Column('geo_longitude', sa.Float, nullable=True),
            sa.Column('location_verified', sa.Boolean, nullable=True, default=False),
            sa.Column('qr_code_data', sa.String(255), nullable=True),
            sa.Column('device_id', sa.String(255), nullable=True),
            sa.Column('network_status', sa.String(50), nullable=True),
            sa.Column('sync_timestamp', sa.DateTime, nullable=True),
            sa.Column('is_manual', sa.Boolean, nullable=True, default=False),
            sa.Column('justification', sa.Text, nullable=True),
            sa.Column('approved_by_id', sa.Integer, sa.ForeignKey('users.id'), nullable=True),
            sa.Column('approval_timestamp', sa.DateTime, nullable=True),
            sa.Column('check_method', sa.String(50), nullable=True),
        ]
        
        # Ajouter chaque colonne si elle n'existe pas
        for column in new_columns:
            add_column_if_not_exists(engine, table_name, column)
        
        print("Migration terminée avec succès!")

if __name__ == "__main__":
    run_migration()
