"""
Routes de profil utilisateur
"""

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required
from middleware.auth import get_current_user
from middleware.audit import log_user_action
from backend.database import db
from backend.models.pointage import Pointage
from backend.models.leave_request import LeaveRequest
from backend.utils.pdf_utils import (
    build_pdf_document,
    create_styled_table,
    get_report_styles,
    generate_report_title_elements,
)
from reportlab.platypus import Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    """Récupère le profil de l'utilisateur connecté"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        return jsonify({
            'profile': current_user.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération du profil: {e}")
        return jsonify(message="Erreur interne du serveur"), 500

@profile_bp.route('', methods=['PUT'])
@jwt_required()
def update_profile():
    """Met à jour le profil de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        
        # Sauvegarder les anciennes valeurs pour l'audit
        old_values = current_user.to_dict()
        
        # Champs modifiables par l'utilisateur
        updatable_fields = ['nom', 'prenom', 'phone', 'address']
        
        for field in updatable_fields:
            if field in data:
                setattr(current_user, field, data[field])
        
        # Logger l'action
        log_user_action(
            action='UPDATE_PROFILE',
            resource_type='User',
            resource_id=current_user.id,
            old_values=old_values,
            new_values=current_user.to_dict()
        )
        
        db.session.commit()

        try:
            from backend.utils.webhook_utils import dispatch_webhook_event
            dispatch_webhook_event(
                event_type='user.updated',
                payload_data=current_user.to_dict(include_sensitive=False), # Send non-sensitive updated data
                company_id=current_user.company_id
            )
        except Exception as webhook_error:
            current_app.logger.error(f"Failed to dispatch user.updated webhook for user {current_user.id} after profile update: {webhook_error}")

        return jsonify({
            'message': 'Profil mis à jour avec succès',
            'profile': current_user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour du profil: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@profile_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change le mot de passe de l'utilisateur"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify(message="Mot de passe actuel et nouveau mot de passe requis"), 400
        
        # Vérifier le mot de passe actuel
        if not current_user.check_password(current_password):
            return jsonify(message="Mot de passe actuel incorrect"), 401
        
        # Valider le nouveau mot de passe (strength and history)
        from backend.utils.security_utils import validate_password_policy
        policy_errors = validate_password_policy(new_password, user_object=current_user)
        if policy_errors:
            return jsonify(message="Validation du mot de passe échouée.", errors=policy_errors), 400
        
        # Changer le mot de passe
        current_user.set_password(new_password) # This will also update history
        
        # Logger l'action
        log_user_action(
            action='CHANGE_PASSWORD',
            resource_type='User',
            resource_id=current_user.id,
            details={'password_changed': True}
        )
        
        db.session.commit()
        
        return jsonify(message="Mot de passe modifié avec succès"), 200
        
    except Exception as e:
        print(f"Erreur lors du changement de mot de passe: {e}")
        db.session.rollback()
        return jsonify(message="Erreur interne du serveur"), 500

@profile_bp.route('/export', methods=['GET'])
@jwt_required()
def export_profile_data():
    """Exporte les données de l'utilisateur et ses pointages."""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        from backend.models.pointage import Pointage

        pointages = Pointage.query.filter_by(user_id=current_user.id).order_by(
            Pointage.date_pointage
        ).all()

        export_data = {
            'user': current_user.to_dict(include_sensitive=True),
            'pointages': [p.to_dict() for p in pointages]
        }

        return jsonify(export_data), 200

    except Exception as e:
        print(f"Erreur lors de l'export du profil: {e}")
        return jsonify(message="Erreur interne du serveur"), 500



@profile_bp.route('/my-attendance-report/pdf', methods=['GET'])
@jwt_required()
def my_attendance_report_pdf(): # Renamed to avoid conflict if my_leave_history_pdf existed with same name
    """Génère un rapport PDF de l'historique des pointages de l'utilisateur connecté."""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        pointage_type_filter = request.args.get('pointage_type')
        pointage_status_filter = request.args.get('pointage_status') # 'present', 'retard'
        sort_by = request.args.get('sort_by', 'date')
        sort_direction = request.args.get('sort_direction', 'desc')

        query = Pointage.query.filter_by(user_id=current_user.id)

        report_filters_texts = []
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage >= start_date)
            report_filters_texts.append(f"Début: {start_date.strftime('%d/%m/%Y')}")
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage <= end_date)
            report_filters_texts.append(f"Fin: {end_date.strftime('%d/%m/%Y')}")
        if pointage_type_filter:
            query = query.filter(Pointage.type == pointage_type_filter)
            report_filters_texts.append(f"Type: {pointage_type_filter}")
        if pointage_status_filter:
            query = query.filter(Pointage.statut == pointage_status_filter)
            report_filters_texts.append(f"Statut Pointage: {pointage_status_filter}")

        period_str = ", ".join(report_filters_texts) if report_filters_texts else "toutes périodes"

        # Sorting logic
        order_criteria = []
        # Define allowed sort fields for Pointage to prevent arbitrary column sorting
        allowed_sort_fields = {
            "date": [Pointage.date_pointage, Pointage.heure_arrivee],
            "type": [Pointage.type, Pointage.date_pointage, Pointage.heure_arrivee],
            "status": [Pointage.statut, Pointage.date_pointage, Pointage.heure_arrivee]
        }
        if sort_by in allowed_sort_fields:
            order_criteria.extend(allowed_sort_fields[sort_by])
        else: # Default sort
            order_criteria.extend(allowed_sort_fields["date"])

        if sort_direction == 'desc':
            final_order_criteria = [criterion.desc() for criterion in order_criteria]
        else: # asc
            final_order_criteria = [criterion.asc() for criterion in order_criteria]

        query = query.order_by(*final_order_criteria)
        pointages = query.all()

        buffer = BytesIO()
        styles = get_report_styles() # from pdf_utils
        story = generate_report_title_elements( # from pdf_utils
            title_str=f"Mon Historique de Présence - {current_user.prenom} {current_user.nom}",
            period_str=period_str
        )

        if not pointages:
            story.append(Paragraph("Aucun pointage trouvé pour les filtres sélectionnés.", styles['Normal']))
        else:
            table_data = [
                [Paragraph(col, styles['SmallText']) for col in
                    ["Date", "Arrivée", "Départ", "Durée (H)", "Type", "Retard (min)", "Lieu/Mission", "Statut"]]
            ]
            for p in pointages:
                p_dict = p.to_dict() # Use existing to_dict for consistency
                heure_arrivee_str = p_dict.get('heure_arrivee', "N/A")
                heure_depart_str = p_dict.get('heure_depart', "N/A")
                duration_hours_str = p_dict.get('worked_hours', "")
                if isinstance(duration_hours_str, (float, int)): duration_hours_str = f"{duration_hours_str:.2f}"

                retard_str = str(p_dict.get('delay_minutes', 0))
                lieu_mission_str = p.office.name if p.type == 'office' and p.office else (p.mission_order_number or "N/A")

                table_data.append([
                    datetime.strptime(p_dict['date_pointage'], '%Y-%m-%d').strftime('%d/%m/%y'),
                    heure_arrivee_str,
                    heure_depart_str,
                    duration_hours_str,
                    Paragraph(p_dict.get('type', "N/A"), styles['SmallText']),
                    retard_str,
                    Paragraph(lieu_mission_str, styles['SmallText']),
                    Paragraph(p_dict.get('statut', ""), styles['SmallText'])
                ])

            col_widths = [0.7*inch, 0.7*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.7*inch, 1.5*inch, 1.5*inch]
            custom_table_styles = [
                ('FONTSIZE', (0,0), (-1,-1), 7), ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]), # from reportlab.lib import colors
                 ('ALIGN', (1,1), (1, -1), 'CENTER'), ('ALIGN', (2, 1), (2, -1), 'CENTER'), # Arrivee, Depart
                ('ALIGN', (3, 1), (3, -1), 'RIGHT'),  # Duree
                ('ALIGN', (4, 1), (4, -1), 'CENTER'), # Type
                ('ALIGN', (5, 1), (5, -1), 'RIGHT'),  # Retard
                ('ALIGN', (0,1), (0, -1), 'LEFT'),   # Date
                ('ALIGN', (6,1), (-1, -1), 'LEFT'),  # Lieu/Mission, Statut
            ]
            attendance_table = create_styled_table(table_data, col_widths=col_widths, style_commands=custom_table_styles) # from pdf_utils
            story.append(attendance_table)

        final_pdf_buffer = build_pdf_document( # from pdf_utils
            buffer, story,
            title=f"Historique Présence - {current_user.prenom} {current_user.nom}",
            author="PointFlex Application"
        )
        return send_file(final_pdf_buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'mon_historique_presence_{current_user.nom.lower()}_{datetime.now().strftime("%Y%m%d")}.pdf')

    except Exception as e:
        current_app.logger.error(f"Erreur génération PDF présence pour utilisateur {current_user.id if 'current_user' in locals() and current_user else 'N/A'}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur lors de la génération du PDF."), 500



@profile_bp.route('/my-leave-report/pdf', methods=['GET'])
@jwt_required()
def my_leave_history_pdf():
    """Génère un rapport PDF de l'historique des congés de l'utilisateur connecté."""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        # Optional filters for status/type if needed in future
        pointage_type_filter = request.args.get('pointage_type')
        pointage_status_filter = request.args.get('pointage_status')
        status_filter = request.args.get('status')
        sort_by = request.args.get('sort_by', 'date')  # Default sort by date for personal report
        sort_direction = request.args.get('sort_direction', 'desc')


        query = LeaveRequest.query.filter_by(user_id=current_user.id)

        report_filters_texts = []
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(LeaveRequest.start_date >= start_date)
            report_filters_texts.append(f"Début: {start_date.strftime('%d/%m/%Y')}")
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(LeaveRequest.end_date <= end_date)
            report_filters_texts.append(f"Fin: {end_date.strftime('%d/%m/%Y')}")
        if status_filter:
            query = query.filter(LeaveRequest.status == status_filter)
            report_filters_texts.append(f"Statut: {status_filter}")

        period_str = ", ".join(report_filters_texts) if report_filters_texts else "toutes périodes"

        leave_requests = query.order_by(LeaveRequest.start_date.desc()).all()

        buffer = BytesIO()
        styles = get_report_styles()

        story = generate_report_title_elements(
            title_str=f"Mon Historique de Congés - {current_user.prenom} {current_user.nom}",
            period_str=period_str
        )

        if not leave_requests:
            story.append(Paragraph("Aucune demande de congé trouvée pour les filtres sélectionnés.", styles['Normal']))
        else:
            table_data = [
                [Paragraph(col, styles['SmallText']) for col in
                    ["Type Congé", "Début", "Fin", "P.Début", "P.Fin", "Jours Dem.", "Statut", "Motif", "Approuvé par", "Comm. Approb."]]
            ]

            for lr in leave_requests:
                approver_name = f"{lr.approved_by.prenom} {lr.approved_by.nom}" if lr.approved_by else "N/A"
                table_data.append([
                    Paragraph(lr.leave_type.name if lr.leave_type else "N/A", styles['SmallText']),
                    lr.start_date.strftime('%d/%m/%y'),
                    lr.end_date.strftime('%d/%m/%y'),
                    Paragraph(lr.start_day_period.replace('_', ' ').replace('half day ', '½j '), styles['SmallText']),
                    Paragraph(lr.end_day_period.replace('_', ' ').replace('half day ', '½j '), styles['SmallText']),
                    str(lr.requested_days),
                    Paragraph(lr.status, styles['SmallText']),
                    Paragraph(lr.reason or "", styles['SmallText']),
                    Paragraph(approver_name, styles['SmallText']),
                    Paragraph(lr.approver_comments or "", styles['SmallText'])
                ])

            col_widths = [1*inch, 0.6*inch, 0.6*inch, 0.7*inch, 0.7*inch, 0.5*inch, 0.7*inch, 1.2*inch, 1*inch, 1.3*inch]

            custom_table_styles = [
                ('FONTSIZE', (0,0), (-1,-1), 7),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
                ('ALIGN', (1,1), (6, -1), 'CENTER'), # Dates, Periods, Days, Status
                ('ALIGN', (0,1), (0, -1), 'LEFT'),   # Type
                ('ALIGN', (7,1), (-1, -1), 'LEFT'),  # Reason, Approver, Comments
            ]
            leave_table = create_styled_table(table_data, col_widths=col_widths, style_commands=custom_table_styles)
            story.append(leave_table)

        final_pdf_buffer = build_pdf_document(
            buffer, story,
            title=f"Historique Congés - {current_user.prenom} {current_user.nom}",
            author="PointFlex Application"
        )

        return send_file(final_pdf_buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'mon_historique_conges_{current_user.nom.lower()}_{datetime.now().strftime("%Y%m%d")}.pdf')

    except Exception as e:
        current_app.logger.error(f"Erreur génération PDF historique congés pour utilisateur {current_user.id if 'current_user' in locals() and current_user else 'N/A'}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur lors de la génération du PDF."), 500
