"""
Routes Admin - Gestion des entreprises
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from middleware.auth import require_admin, get_current_user
from middleware.audit import log_user_action
from models.user import User
from models.company import Company
from models.office import Office
from models.department import Department
from models.service import Service
from models.position import Position
from models.pointage import Pointage
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from datetime import datetime
from database import db
import json

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/employees', methods=['GET'])
@require_admin
def get_employees():
    """Récupère les employés de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # SuperAdmin peut voir tous les utilisateurs
        if current_user.role == 'superadmin':
            query = User.query
        else:
            # Admin d'entreprise ne voit que ses employés
            query = User.query.filter_by(company_id=current_user.company_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        employees = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'employees': [emp.to_dict() for emp in employees.items],
            'pagination': {
                'page': page,
                'pages': employees.pages,
                'per_page': per_page,
                'total': employees.total
            }
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des employés: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/employees', methods=['POST'])
@require_admin
def create_employee():
    """Crée un nouvel employé"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        # Validation des données requises
        required_fields = ['email', 'nom', 'prenom', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify(message=f"Le champ {field} est requis"), 400
        
        # Vérifier si l'email existe déjà
        if User.query.filter_by(email=data['email']).first():
            return jsonify(message="Un utilisateur avec cet email existe déjà"), 409
        
        # Déterminer l'entreprise
        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
        else:
            company_id = current_user.company_id
        
        # Vérifier les limites de l'entreprise
        if company_id:
            company = Company.query.get(company_id)
            if company and not company.can_add_employee:
                return jsonify(message="Limite d'employés atteinte pour cette entreprise"), 409
        
        # Créer l'employé
        employee = User(
            email=data['email'],
            nom=data['nom'],
            prenom=data['prenom'],
            role=data.get('role', 'employee'),
            company_id=company_id,
            phone=data.get('phone'),
            password=data['password']
        )
        
        db.session.add(employee)
        db.session.flush()  # Pour obtenir l'ID
        
        # Logger l'action
        log_user_action(
            action='CREATE',
            resource_type='User',
            resource_id=employee.id,
            new_values=employee.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Employé créé avec succès',
            'employee': employee.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de l'employé: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/employees/<int:employee_id>', methods=['PUT'])
@require_admin
def update_employee(employee_id):
    """Met à jour un employé"""
    try:
        current_user = get_current_user()
        employee = User.query.get_or_404(employee_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and employee.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = employee.to_dict()
        
        # Mettre à jour les champs
        updatable_fields = ['nom', 'prenom', 'phone', 'role', 'is_active']
        
        for field in updatable_fields:
            if field in data:
                setattr(employee, field, data[field])
        
        # Changer le mot de passe si fourni
        if data.get('password'):
            employee.set_password(data['password'])
        
        # Logger l'action
        log_user_action(
            action='UPDATE',
            resource_type='User',
            resource_id=employee.id,
            old_values=old_values,
            new_values=employee.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Employé mis à jour avec succès',
            'employee': employee.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de l'employé: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
@require_admin
def delete_employee(employee_id):
    """Supprime un employé"""
    try:
        current_user = get_current_user()
        employee = User.query.get_or_404(employee_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and employee.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        # Empêcher la suppression de soi-même
        if employee.id == current_user.id:
            return jsonify(message="Vous ne pouvez pas vous supprimer vous-même"), 409
        
        # Sauvegarder pour l'audit
        old_values = employee.to_dict()
        
        # Logger l'action avant suppression
        log_user_action(
            action='DELETE',
            resource_type='User',
            resource_id=employee.id,
            old_values=old_values
        )
        
        db.session.delete(employee)
        db.session.commit()
        
        return jsonify(message="Employé supprimé avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de l'employé: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/organization-data', methods=['GET'])
@require_admin
def get_organization_data():
    """Récupère les données organisationnelles (départements, services, etc.)"""
    try:
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            departments = Department.query.all()
            services = Service.query.all()
            positions = Position.query.all()
        else:
            departments = Department.query.filter_by(company_id=current_user.company_id).all()
            services = Service.query.filter_by(company_id=current_user.company_id).all()
            positions = Position.query.filter_by(company_id=current_user.company_id).all()

        return jsonify({
            'departments': [d.to_dict() for d in departments],
            'services': [s.to_dict() for s in services],
            'positions': [p.to_dict() for p in positions]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des données organisationnelles: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments', methods=['GET'])
@require_admin
def get_departments():
    """Liste les départements de l'entreprise."""
    try:
        current_user = get_current_user()
        if current_user.role == 'superadmin':
            departments = Department.query.all()
        else:
            departments = Department.query.filter_by(company_id=current_user.company_id).all()
        return jsonify({'departments': [d.to_dict() for d in departments]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des départements: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments', methods=['POST'])
@require_admin
def create_department():
    """Crée un département."""
    try:
        data = request.get_json()
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="company_id requis"), 400
        else:
            company_id = current_user.company_id

        department = Department(
            company_id=company_id,
            name=data.get('name'),
            description=data.get('description'),
            manager_name=data.get('manager_name'),
            is_active=data.get('is_active', True),
        )
        db.session.add(department)
        db.session.flush()

        log_user_action(
            action='CREATE',
            resource_type='Department',
            resource_id=department.id,
            new_values=department.to_dict(),
        )

        db.session.commit()
        return jsonify({'department': department.to_dict(), 'message': 'Département créé'}), 201
    except Exception as e:
        print(f"Erreur lors de la création du département: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments/<int:department_id>', methods=['PUT'])
@require_admin
def update_department(department_id):
    """Met à jour un département."""
    try:
        department = Department.query.get_or_404(department_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and department.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        data = request.get_json()
        old = department.to_dict()
        for field in ['name', 'description', 'manager_name', 'is_active']:
            if field in data:
                setattr(department, field, data[field])

        log_user_action(
            action='UPDATE',
            resource_type='Department',
            resource_id=department.id,
            old_values=old,
            new_values=department.to_dict(),
        )

        db.session.commit()
        return jsonify({'department': department.to_dict(), 'message': 'Département mis à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour du département: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/departments/<int:department_id>', methods=['DELETE'])
@require_admin
def delete_department(department_id):
    """Supprime un département."""
    try:
        department = Department.query.get_or_404(department_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and department.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old = department.to_dict()
        log_user_action(
            action='DELETE',
            resource_type='Department',
            resource_id=department.id,
            old_values=old,
        )
        db.session.delete(department)
        db.session.commit()
        return jsonify(message='Département supprimé'), 200
    except Exception as e:
        print(f"Erreur lors de la suppression du département: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services', methods=['GET'])
@require_admin
def get_services():
    """Liste les services."""
    try:
        current_user = get_current_user()
        query = Service.query
        if current_user.role != 'superadmin':
            query = query.filter_by(company_id=current_user.company_id)
        department_id = request.args.get('department_id', type=int)
        if department_id:
            query = query.filter_by(department_id=department_id)
        services = query.all()
        return jsonify({'services': [s.to_dict() for s in services]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des services: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services', methods=['POST'])
@require_admin
def create_service():
    """Crée un service."""
    try:
        data = request.get_json()
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="company_id requis"), 400
        else:
            company_id = current_user.company_id

        service = Service(
            company_id=company_id,
            department_id=data.get('department_id'),
            name=data.get('name'),
            description=data.get('description'),
            manager_name=data.get('manager_name'),
            is_active=data.get('is_active', True),
        )
        db.session.add(service)
        db.session.flush()

        log_user_action(
            action='CREATE',
            resource_type='Service',
            resource_id=service.id,
            new_values=service.to_dict(),
        )

        db.session.commit()
        return jsonify({'service': service.to_dict(), 'message': 'Service créé'}), 201
    except Exception as e:
        print(f"Erreur lors de la création du service: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services/<int:service_id>', methods=['PUT'])
@require_admin
def update_service(service_id):
    """Met à jour un service."""
    try:
        service = Service.query.get_or_404(service_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and service.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        data = request.get_json()
        old = service.to_dict()
        for field in ['name', 'description', 'manager_name', 'department_id', 'is_active']:
            if field in data:
                setattr(service, field, data[field])

        log_user_action(
            action='UPDATE',
            resource_type='Service',
            resource_id=service.id,
            old_values=old,
            new_values=service.to_dict(),
        )

        db.session.commit()
        return jsonify({'service': service.to_dict(), 'message': 'Service mis à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour du service: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/services/<int:service_id>', methods=['DELETE'])
@require_admin
def delete_service(service_id):
    """Supprime un service."""
    try:
        service = Service.query.get_or_404(service_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and service.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old = service.to_dict()
        log_user_action(
            action='DELETE',
            resource_type='Service',
            resource_id=service.id,
            old_values=old,
        )
        db.session.delete(service)
        db.session.commit()
        return jsonify(message='Service supprimé'), 200
    except Exception as e:
        print(f"Erreur lors de la suppression du service: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions', methods=['GET'])
@require_admin
def get_positions():
    """Liste les postes."""
    try:
        current_user = get_current_user()
        if current_user.role == 'superadmin':
            positions = Position.query.all()
        else:
            positions = Position.query.filter_by(company_id=current_user.company_id).all()
        return jsonify({'positions': [p.to_dict() for p in positions]}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des postes: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions', methods=['POST'])
@require_admin
def create_position():
    """Crée un poste."""
    try:
        data = request.get_json()
        current_user = get_current_user()

        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="company_id requis"), 400
        else:
            company_id = current_user.company_id

        position = Position(
            company_id=company_id,
            name=data.get('name'),
            description=data.get('description'),
            level=data.get('level'),
            salary_min=data.get('salary_min'),
            salary_max=data.get('salary_max'),
            requirements=data.get('requirements'),
            is_active=data.get('is_active', True),
        )
        db.session.add(position)
        db.session.flush()

        log_user_action(
            action='CREATE',
            resource_type='Position',
            resource_id=position.id,
            new_values=position.to_dict(),
        )

        db.session.commit()
        return jsonify({'position': position.to_dict(), 'message': 'Poste créé'}), 201
    except Exception as e:
        print(f"Erreur lors de la création du poste: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions/<int:position_id>', methods=['PUT'])
@require_admin
def update_position(position_id):
    """Met à jour un poste."""
    try:
        position = Position.query.get_or_404(position_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and position.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        data = request.get_json()
        old = position.to_dict()
        for field in ['name', 'description', 'level', 'salary_min', 'salary_max', 'requirements', 'is_active']:
            if field in data:
                setattr(position, field, data[field])

        log_user_action(
            action='UPDATE',
            resource_type='Position',
            resource_id=position.id,
            old_values=old,
            new_values=position.to_dict(),
        )

        db.session.commit()
        return jsonify({'position': position.to_dict(), 'message': 'Poste mis à jour'}), 200
    except Exception as e:
        print(f"Erreur lors de la mise à jour du poste: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/positions/<int:position_id>', methods=['DELETE'])
@require_admin
def delete_position(position_id):
    """Supprime un poste."""
    try:
        position = Position.query.get_or_404(position_id)
        current_user = get_current_user()
        if current_user.role != 'superadmin' and position.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403

        old = position.to_dict()
        log_user_action(
            action='DELETE',
            resource_type='Position',
            resource_id=position.id,
            old_values=old,
        )
        db.session.delete(position)
        db.session.commit()
        return jsonify(message='Poste supprimé'), 200
    except Exception as e:
        print(f"Erreur lors de la suppression du poste: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices', methods=['GET'])
@require_admin
def get_offices():
    """Récupère les bureaux de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # SuperAdmin peut voir tous les bureaux
        if current_user.role == 'superadmin':
            offices = Office.query.all()
        else:
            # Admin d'entreprise ne voit que ses bureaux
            offices = Office.query.filter_by(company_id=current_user.company_id).all()
        
        return jsonify({
            'offices': [office.to_dict() for office in offices]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des bureaux: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices', methods=['POST'])
@require_admin
def create_office():
    """Crée un nouveau bureau"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        # Validation des données requises
        required_fields = ['name', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify(message=f"Le champ {field} est requis"), 400
        
        # Déterminer l'entreprise
        if current_user.role == 'superadmin':
            company_id = data.get('company_id')
            if not company_id:
                return jsonify(message="L'ID de l'entreprise est requis pour un SuperAdmin"), 400
        else:
            company_id = current_user.company_id
        
        # Traiter les amenities pour s'assurer qu'elles sont stockées comme JSON
        amenities = data.get('amenities')
        if amenities and not isinstance(amenities, str):
            amenities = json.dumps(amenities)
        
        # Créer le bureau
        office = Office(
            company_id=company_id,
            name=data['name'],
            address=data.get('address'),
            city=data.get('city'),
            country=data.get('country'),
            latitude=data['latitude'],
            longitude=data['longitude'],
            radius=data.get('radius', 100),
            timezone=data.get('timezone', 'Europe/Paris'),
            capacity=data.get('capacity'),
            amenities=amenities,
            manager_name=data.get('manager_name'),
            phone=data.get('phone'),
            is_active=data.get('is_active', True),
            is_main=data.get('is_main', False)
        )
        
        db.session.add(office)
        db.session.flush()  # Pour obtenir l'ID
        
        # Logger l'action
        log_user_action(
            action='CREATE',
            resource_type='Office',
            resource_id=office.id,
            new_values=office.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Bureau créé avec succès',
            'office': office.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Erreur lors de la création du bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices/<int:office_id>', methods=['PUT'])
@require_admin
def update_office(office_id):
    """Met à jour un bureau"""
    try:
        current_user = get_current_user()
        office = Office.query.get_or_404(office_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and office.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = office.to_dict()
        
        # Traiter les amenities pour s'assurer qu'elles sont stockées comme JSON
        if 'amenities' in data and not isinstance(data['amenities'], str):
            data['amenities'] = json.dumps(data['amenities'])
        
        # Mettre à jour les champs
        updatable_fields = [
            'name', 'address', 'city', 'country', 'latitude', 'longitude',
            'radius', 'timezone', 'capacity', 'amenities', 'manager_name',
            'phone', 'is_active', 'is_main'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(office, field, data[field])
        
        # Logger l'action
        log_user_action(
            action='UPDATE',
            resource_type='Office',
            resource_id=office.id,
            old_values=old_values,
            new_values=office.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Bureau mis à jour avec succès',
            'office': office.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour du bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/offices/<int:office_id>', methods=['DELETE'])
@require_admin
def delete_office(office_id):
    """Supprime un bureau"""
    try:
        current_user = get_current_user()
        office = Office.query.get_or_404(office_id)
        
        # Vérifier les permissions
        if current_user.role != 'superadmin' and office.company_id != current_user.company_id:
            return jsonify(message="Accès non autorisé"), 403
        
        # Sauvegarder pour l'audit
        old_values = office.to_dict()
        
        # Logger l'action avant suppression
        log_user_action(
            action='DELETE',
            resource_type='Office',
            resource_id=office.id,
            old_values=old_values
        )
        
        db.session.delete(office)
        db.session.commit()
        
        return jsonify(message="Bureau supprimé avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression du bureau: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/company/settings', methods=['GET'])
@require_admin
def get_company_settings():
    """Récupère les paramètres de l'entreprise"""
    current_user = get_current_user()

    if not current_user.company_id:
        return jsonify(message="Aucune entreprise associée à cet utilisateur"), 400

    company = Company.query.get_or_404(current_user.company_id)

    return jsonify({'company': company.to_dict(include_sensitive=True)}), 200


@admin_bp.route('/company/settings', methods=['PUT'])
@require_admin
def update_company_settings():
    """Met à jour les paramètres de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # Vérifier que l'utilisateur a une entreprise
        if not current_user.company_id:
            return jsonify(message="Aucune entreprise associée à cet utilisateur"), 400
        
        company = Company.query.get_or_404(current_user.company_id)
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = company.to_dict()
        
        # Mettre à jour les champs
        updatable_fields = [
            'office_latitude', 'office_longitude', 'office_radius',
            'work_start_time', 'late_threshold', 'logo_url', 'theme_color'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(company, field, data[field])
        
        # Logger l'action
        log_user_action(
            action='UPDATE_COMPANY_SETTINGS',
            resource_type='Company',
            resource_id=company.id,
            old_values=old_values,
            new_values=company.to_dict()
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Paramètres de l\'entreprise mis à jour avec succès',
            'company': company.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_company_stats():
    """Récupère les statistiques de l'entreprise"""
    try:
        current_user = get_current_user()
        
        # Vérifier que l'utilisateur a une entreprise
        if not current_user.company_id:
            return jsonify(message="Aucune entreprise associée à cet utilisateur"), 400
        
        company = Company.query.get_or_404(current_user.company_id)
        
        # Récupérer les statistiques
        total_employees = User.query.filter_by(company_id=company.id).count()
        active_employees = User.query.filter_by(company_id=company.id, is_active=True).count()
        
        # Statistiques simulées pour la démo
        stats = {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'departments': 5,  # Simulé
            'services': 12,    # Simulé
            'offices': Office.query.filter_by(company_id=company.id).count(),
            'attendance_rate': 94.5,  # Simulé
            'retention_rate': 97.2,   # Simulé
            'growth_rate': 12.5       # Simulé
        }
        
        return jsonify({
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {e}")
        return jsonify(message="Erreur interne du serveur"), 500


@admin_bp.route('/attendance-report/pdf', methods=['GET'])
@require_admin
def attendance_report_pdf():
    """Génère un résumé PDF des pointages de l'entreprise"""
    try:
        current_user = get_current_user()

        if not current_user.company_id:
            return jsonify(message="Aucune entreprise associée"), 400

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        query = Pointage.query.join(User).filter(User.company_id == current_user.company_id)

        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage <= end_date)

        pointages = query.all()

        summary = {}
        for p in pointages:
            user_name = f"{p.user.prenom} {p.user.nom}" if p.user else str(p.user_id)
            summary[user_name] = summary.get(user_name, 0) + 1

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setFont("Helvetica", 12)
        pdf.drawString(50, 800, "Résumé de présence")

        y = 760
        pdf.drawString(50, y, "Employé")
        pdf.drawString(300, y, "Pointages")
        y -= 20

        for name, count in summary.items():
            pdf.drawString(50, y, name)
            pdf.drawString(300, y, str(count))
            y -= 20
            if y < 50:
                pdf.showPage()
                pdf.setFont("Helvetica", 12)
                y = 800

        pdf.showPage()
        pdf.save()
        buffer.seek(0)

        return send_file(buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name='attendance_report.pdf')

    except Exception as e:
        print(f"Erreur génération PDF: {e}")
        return jsonify(message="Erreur interne du serveur"), 500