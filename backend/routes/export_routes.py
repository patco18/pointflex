from flask import Blueprint, jsonify, request, send_file, current_app
from flask_jwt_extended import jwt_required
from backend.middleware.auth import require_admin
from backend.database import db
from backend.models.user import User
from backend.models.pointage import Pointage
from backend.models.leave_request import LeaveRequest
from backend.models.invoice import Invoice
from backend.models.company import Company
import pandas as pd
import io
import csv
import json
from datetime import datetime
from pathlib import Path
import tempfile

export_bp = Blueprint('export', __name__)

def get_admin_company():
    """Helper to get the admin's company"""
    from flask_jwt_extended import get_jwt_identity
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return None, jsonify(message="Utilisateur non trouvé"), 404
    
    if not user.company_id:
        return None, jsonify(message="Utilisateur non associé à une entreprise"), 400
    
    company = Company.query.get(user.company_id)
    if not company:
        return None, jsonify(message="Entreprise non trouvée"), 404
    
    return company, None

@export_bp.route('/admin/company/export/<data_type>', methods=['GET'])
@jwt_required()
@require_admin
def export_company_data(data_type):
    """Exporte les données de l'entreprise dans le format demandé"""
    format_type = request.args.get('format', 'csv')
    
    # Vérifier que le format est supporté
    if format_type not in ['csv', 'excel', 'json']:
        return jsonify(message="Format non supporté. Utilisez 'csv', 'excel' ou 'json'"), 400
    
    # Vérifier que le type de données est supporté
    if data_type not in ['employees', 'attendance', 'leaves', 'billing']:
        return jsonify(message="Type de données non supporté"), 400
    
    company, error_response = get_admin_company()
    if error_response:
        return error_response
    
    try:
        # Obtenir les données selon le type demandé
        if data_type == 'employees':
            data = get_employees_data(company.id)
            filename_prefix = "employes"
        elif data_type == 'attendance':
            data = get_attendance_data(company.id)
            filename_prefix = "pointages"
        elif data_type == 'leaves':
            data = get_leaves_data(company.id)
            filename_prefix = "conges"
        elif data_type == 'billing':
            data = get_billing_data(company.id)
            filename_prefix = "factures"
        
        # Exporter selon le format demandé
        if format_type == 'csv':
            return export_as_csv(data, f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        elif format_type == 'excel':
            return export_as_excel(data, f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        elif format_type == 'json':
            return export_as_json(data, f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'exportation des données: {str(e)}")
        return jsonify(message="Erreur lors de l'exportation des données"), 500


def get_employees_data(company_id):
    """Récupère les données des employés pour l'export"""
    users = User.query.filter_by(company_id=company_id).all()
    data = []
    
    for user in users:
        data.append({
            'id': user.id,
            'nom': user.nom,
            'prenom': user.prenom,
            'email': user.email,
            'role': user.role,
            'date_creation': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
            'telephone': getattr(user, 'phone', ''),
            'departement': getattr(user, 'department_name', ''),
            'position': getattr(user, 'position_name', ''),
            'statut': 'Actif' if getattr(user, 'is_active', True) else 'Inactif'
        })
    
    return data


def get_attendance_data(company_id):
    """Récupère les données de pointage pour l'export"""
    users = User.query.filter_by(company_id=company_id).all()
    user_ids = [user.id for user in users]
    
    pointages = Pointage.query.filter(Pointage.user_id.in_(user_ids)).all()
    data = []
    
    for p in pointages:
        user = User.query.get(p.user_id)
        data.append({
            'id': p.id,
            'employe_nom': f"{user.nom} {user.prenom}" if user else "Inconnu",
            'type': p.checkin_type,
            'date_pointage': p.timestamp.strftime('%Y-%m-%d') if p.timestamp else None,
            'heure_pointage': p.timestamp.strftime('%H:%M:%S') if p.timestamp else None,
            'statut': p.status,
            'latitude': p.latitude,
            'longitude': p.longitude,
            'ip_address': p.ip_address,
            'device_info': p.device_info
        })
    
    return data


def get_leaves_data(company_id):
    """Récupère les données de congés pour l'export"""
    users = User.query.filter_by(company_id=company_id).all()
    user_ids = [user.id for user in users]
    
    leave_requests = LeaveRequest.query.filter(LeaveRequest.user_id.in_(user_ids)).all()
    data = []
    
    for lr in leave_requests:
        user = User.query.get(lr.user_id)
        approver = User.query.get(lr.approver_id) if lr.approver_id else None
        
        data.append({
            'id': lr.id,
            'employe': f"{user.nom} {user.prenom}" if user else "Inconnu",
            'type_conge': lr.leave_type_name,
            'date_debut': lr.start_date.strftime('%Y-%m-%d') if lr.start_date else None,
            'date_fin': lr.end_date.strftime('%Y-%m-%d') if lr.end_date else None,
            'jours_demandes': lr.requested_days,
            'statut': lr.status,
            'motif': lr.reason,
            'approbateur': f"{approver.nom} {approver.prenom}" if approver else None,
            'commentaires': lr.approver_comments,
            'date_demande': lr.created_at.strftime('%Y-%m-%d %H:%M:%S') if lr.created_at else None
        })
    
    return data


def get_billing_data(company_id):
    """Récupère les données de facturation pour l'export"""
    invoices = Invoice.query.filter_by(company_id=company_id).all()
    data = []
    
    for invoice in invoices:
        data.append({
            'id': invoice.id,
            'numero': invoice.invoice_number,
            'montant': invoice.amount_fcfa or invoice.amount_eur * 655.957,  # Conversion EUR vers FCFA
            'devise': 'FCFA',
            'date_emission': invoice.created_at.strftime('%Y-%m-%d') if invoice.created_at else None,
            'date_echeance': invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else None,
            'statut': invoice.status,
            'date_paiement': invoice.paid_date.strftime('%Y-%m-%d') if invoice.paid_date else None,
            'methode_paiement': invoice.payment_method or 'Non spécifié'
        })
    
    return data


def export_as_csv(data, filename):
    """Exporte les données au format CSV"""
    if not data:
        return jsonify(message="Aucune donnée à exporter"), 404
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    
    mem_file = io.BytesIO()
    mem_file.write(output.getvalue().encode('utf-8-sig'))  # Utiliser UTF-8 avec BOM pour Excel
    mem_file.seek(0)
    
    return send_file(
        mem_file,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"{filename}.csv"
    )


def export_as_excel(data, filename):
    """Exporte les données au format Excel"""
    if not data:
        return jsonify(message="Aucune donnée à exporter"), 404
    
    df = pd.DataFrame(data)
    
    # Créer un fichier temporaire
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        df.to_excel(tmp.name, index=False, engine='openpyxl')
        tmp_path = tmp.name
    
    return send_file(
        tmp_path,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f"{filename}.xlsx"
    )


def export_as_json(data, filename):
    """Exporte les données au format JSON"""
    if not data:
        return jsonify(message="Aucune donnée à exporter"), 404
    
    mem_file = io.BytesIO()
    mem_file.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))
    mem_file.seek(0)
    
    return send_file(
        mem_file,
        mimetype='application/json',
        as_attachment=True,
        download_name=f"{filename}.json"
    )
