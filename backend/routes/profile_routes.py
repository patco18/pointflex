"""
Routes de profil utilisateur
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from middleware.auth import get_current_user
from middleware.audit import log_user_action
from database import db

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

from io import BytesIO
from flask import send_file, current_app
from datetime import datetime, timedelta
from backend.models.pointage import Pointage # Assuming Pointage model is accessible
from backend.utils.pdf_utils import build_pdf_document, create_styled_table, get_report_styles, generate_report_title_elements
from reportlab.platypus import Paragraph, Spacer
from reportlab.lib.units import inch

@profile_bp.route('/my-attendance-report/pdf', methods=['GET'])
@jwt_required()
def my_attendance_report_pdf():
    """Génère un rapport PDF des pointages de l'utilisateur connecté."""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify(message="Utilisateur non trouvé"), 401

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        query = Pointage.query.filter_by(user_id=current_user.id)

        date_filter_text = "toutes périodes"
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage.between(start_date, end_date))
            date_filter_text = f"du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}"
        elif start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage >= start_date)
            date_filter_text = f"à partir du {start_date.strftime('%d/%m/%Y')}"
        elif end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Pointage.date_pointage <= end_date)
            date_filter_text = f"jusqu'au {end_date.strftime('%d/%m/%Y')}"

        pointages = query.order_by(Pointage.date_pointage, Pointage.heure_arrivee).all()

        buffer = BytesIO()
        styles = get_report_styles()

        story = generate_report_title_elements(
            title_str=f"Mon Rapport de Présence - {current_user.prenom} {current_user.nom}",
            period_str=date_filter_text
        )

        if not pointages:
            story.append(Paragraph("Aucun pointage trouvé pour la période sélectionnée.", styles['Normal']))
        else:
            table_data = [
                [Paragraph(col, styles['SmallText']) for col in ["Date", "Arrivée", "Départ", "Durée (H)", "Type", "Retard (min)", "Lieu/Mission", "Commentaire"]]
            ]

            for p in pointages:
                heure_arrivee_str = p.heure_arrivee.strftime('%H:%M') if p.heure_arrivee else "N/A"
                heure_depart_str = p.heure_depart.strftime('%H:%M') if p.heure_depart else "N/A"

                duration_hours_str = ""
                if p.heure_arrivee and p.heure_depart:
                    try:
                        datetime_arrivee = datetime.combine(p.date_pointage, p.heure_arrivee)
                        datetime_depart = datetime.combine(p.date_pointage, p.heure_depart)
                        if datetime_depart < datetime_arrivee:
                             datetime_depart += timedelta(days=1)
                        duration = datetime_depart - datetime_arrivee
                        duration_hours = duration.total_seconds() / 3600
                        duration_hours_str = f"{duration_hours:.2f}"
                    except TypeError:
                        duration_hours_str = "Erreur"

                retard_str = str(p.delay_minutes) if p.delay_minutes is not None else "0"
                lieu_mission_str = p.office.name if p.type == 'office' and p.office else (p.mission_order_number or "N/A")

                table_data.append([
                    p.date_pointage.strftime('%d/%m/%y'),
                    heure_arrivee_str,
                    heure_depart_str,
                    duration_hours_str,
                    Paragraph(p.type or "N/A", styles['SmallText']),
                    retard_str,
                    Paragraph(lieu_mission_str, styles['SmallText']),
                    Paragraph(p.statut or "", styles['SmallText']) # Using 'statut' as comment for now
                ])

            col_widths = [0.7*inch, 0.7*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.6*inch, 1.5*inch, 1.8*inch]

            custom_table_styles = [
                ('ALIGN', (1, 1), (1, -1), 'CENTER'), # Date
                ('ALIGN', (2, 1), (2, -1), 'CENTER'), # Arrivee
                ('ALIGN', (3, 1), (3, -1), 'CENTER'), # Depart
                ('ALIGN', (4, 1), (4, -1), 'RIGHT'),  # Duree
                ('ALIGN', (5, 1), (5, -1), 'CENTER'), # Type
                ('ALIGN', (6, 1), (6, -1), 'RIGHT'),  # Retard
                ('ALIGN', (7, 1), (7, -1), 'LEFT'),   # Lieu/Mission
                ('ALIGN', (8, 1), (8, -1), 'LEFT'),   # Comment
                ('FONTSIZE', (0,0), (-1,-1), 7),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
            ]
            attendance_table = create_styled_table(table_data, col_widths=col_widths, style_commands=custom_table_styles)
            story.append(attendance_table)

        final_pdf_buffer = build_pdf_document(
            buffer, story,
            title=f"Rapport Présence - {current_user.prenom} {current_user.nom}",
            author="PointFlex Application"
        )

        return send_file(final_pdf_buffer, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'mon_rapport_presence_{current_user.nom.lower()}_{datetime.now().strftime("%Y%m%d")}.pdf')

    except Exception as e:
        current_app.logger.error(f"Erreur génération PDF pour l'utilisateur {current_user.id if 'current_user' in locals() and current_user else 'N/A'}: {e}", exc_info=True)
        return jsonify(message="Erreur interne du serveur lors de la génération du PDF."), 500


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
        
        # Valider le nouveau mot de passe
        if len(new_password) < 6:
            return jsonify(message="Le nouveau mot de passe doit contenir au moins 6 caractères"), 400
        
        # Changer le mot de passe
        current_user.set_password(new_password)
        
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

        from models.pointage import Pointage

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