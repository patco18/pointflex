#!/usr/bin/env python3
"""
Script d'initialisation de la base de données PointFlex
Crée les tables et les données de démonstration
"""

import os
import sys
from werkzeug.security import generate_password_hash

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.user import User
from models.company import Company
from models.system_settings import SystemSettings

def init_database():
    """Initialise la base de données avec les données de base"""
    
    with app.app_context():
        # Créer les tables
        print("🗄️  Création des tables...")
        db.create_all()
        
        # Vérifier si des données existent déjà
        if User.query.first():
            print("⚠️  La base de données contient déjà des données.")
            response = input("Voulez-vous la réinitialiser ? (y/N): ")
            if response.lower() != 'y':
                print("❌ Initialisation annulée.")
                return
            
            # Supprimer toutes les données
            db.drop_all()
            db.create_all()
        
        # Créer les paramètres système
        print("⚙️  Création des paramètres système...")
        system_settings = SystemSettings(
            max_companies_basic=10,
            max_companies_premium=50,
            max_employees_basic=10,
            max_employees_premium=50,
            max_employees_enterprise=-1,  # Illimité
            default_attendance_radius=100.0,
            max_late_tolerance_minutes=15,
            enable_geofencing=True,
            enable_mission_mode=True
        )
        db.session.add(system_settings)
        
        # Créer l'utilisateur SuperAdmin
        print("👑 Création du SuperAdmin...")
        superadmin = User(
            email='superadmin@pointflex.com',
            password_hash=generate_password_hash('superadmin123'),
            first_name='Super',
            last_name='Admin',
            role='superadmin',
            is_active=True,
            company_id=None
        )
        db.session.add(superadmin)
        
        # Créer une entreprise de démonstration
        print("🏢 Création de l'entreprise de démonstration...")
        demo_company = Company(
            name='Entreprise Démo',
            email='contact@demo.pointflex.com',
            phone='+33123456789',
            address='123 Rue de la Démo, 75001 Paris',
            subscription_plan='premium',
            is_active=True,
            office_latitude=48.8566,  # Paris
            office_longitude=2.3522,
            attendance_radius=100.0,
            work_start_time='09:00',
            late_tolerance_minutes=15
        )
        db.session.add(demo_company)
        db.session.flush()  # Pour obtenir l'ID
        
        # Créer l'admin de l'entreprise démo
        print("👔 Création de l'admin entreprise...")
        admin = User(
            email='admin@pointflex.com',
            password_hash=generate_password_hash('admin123'),
            first_name='Admin',
            last_name='Entreprise',
            role='admin',
            is_active=True,
            company_id=demo_company.id
        )
        db.session.add(admin)
        
        # Créer un employé de démonstration
        print("👤 Création de l'employé de démonstration...")
        employee = User(
            email='employee@pointflex.com',
            password_hash=generate_password_hash('employee123'),
            first_name='Jean',
            last_name='Dupont',
            role='employee',
            is_active=True,
            company_id=demo_company.id
        )
        db.session.add(employee)
        
        # Sauvegarder toutes les modifications
        db.session.commit()
        
        print("✅ Base de données initialisée avec succès!")
        print("\n🔐 Comptes créés:")
        print("SuperAdmin: superadmin@pointflex.com / superadmin123")
        print("Admin Entreprise: admin@pointflex.com / admin123")
        print("Employé: employee@pointflex.com / employee123")
        print("\n🚀 Vous pouvez maintenant démarrer l'application!")

if __name__ == '__main__':
    init_database()
