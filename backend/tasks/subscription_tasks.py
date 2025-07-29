"""
Tâche planifiée pour vérifier les abonnements sur le point d'expirer
et envoyer des notifications par email et dans l'application
"""

from datetime import datetime, timedelta
from backend.database import db
from backend.models.company import Company
from backend.models.notification import Notification
from backend.models.user import User
from backend.models.notification_settings import NotificationSettings
from backend.services.email import send_subscription_expiring_soon_email, send_subscription_expired_email
from flask import current_app
import logging
from dateutil.relativedelta import relativedelta

def check_expiring_subscriptions():
    """
    Vérifie les abonnements sur le point d'expirer et envoie des notifications
    Cette fonction est appelée quotidiennement via une tâche planifiée
    
    Envoie à la fois des notifications dans l'application et des emails
    selon les préférences de notification de l'utilisateur
    """
    logger = current_app.logger
    logger.info("Vérification des abonnements sur le point d'expirer...")
    
    try:
        # Seuils de notification (jours avant expiration)
        thresholds = [30, 14, 7, 3, 1]
        today = datetime.utcnow().date()
        
        # Récupérer toutes les entreprises avec des abonnements actifs
        companies = Company.query.filter(Company.subscription_end_date.isnot(None)).all()
        
        notifications_created = 0
        emails_sent = 0
        
        # URL de base pour le renouvellement des abonnements
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        
        for company in companies:
            if not company.subscription_end_date:
                continue
                
            # Calculer le nombre de jours avant expiration
            days_remaining = (company.subscription_end_date - today).days
            
            # Vérifier si l'abonnement est déjà expiré
            is_expired = days_remaining < 0
            
            # Gérer les abonnements expirés
            if is_expired and days_remaining > -2:  # Notifier uniquement le premier jour d'expiration
                logger.info(f"Abonnement de {company.name} a expiré depuis {abs(days_remaining)} jour(s)")
                
                # Trouver les administrateurs de l'entreprise pour les notifier
                admins = User.query.filter_by(company_id=company.id, role='admin').all()
                
                # Formatage de la date d'expiration pour l'email
                expiration_date = company.subscription_end_date.strftime("%d/%m/%Y")
                
                # URL pour le renouvellement
                renewal_url = f"{frontend_url}/subscription/renew?company_id={company.id}"
                
                for admin in admins:
                    # Créer une notification interne
                    notification = Notification(
                        user_id=admin.id,
                        title="Abonnement expiré",
                        message=f"L'abonnement de votre entreprise a expiré. Certaines fonctionnalités ne sont plus disponibles.",
                        type='subscription_expired',
                        data={
                            'company_id': company.id,
                            'expiration_date': company.subscription_end_date.isoformat(),
                            'subscription_plan': company.subscription_plan,
                            'renewal_url': renewal_url
                        },
                        priority='high'
                    )
                    db.session.add(notification)
                    notifications_created += 1
                    
                    # Vérifier les préférences de notification par email
                    notification_settings = NotificationSettings.query.filter_by(user_id=admin.id).first()
                    
                    # Envoyer un email si l'utilisateur a activé les notifications par email
                    if notification_settings and notification_settings.email_notifications:
                        user_name = f"{admin.prenom} {admin.nom}"
                        plan_name = company.subscription_plan or "Standard"
                        
                        # Envoyer l'email d'expiration
                        email_sent = send_subscription_expired_email(
                            user_email=admin.email,
                            user_name=user_name,
                            company_name=company.name,
                            plan_name=plan_name,
                            expiration_date=expiration_date,
                            renewal_url=renewal_url
                        )
                        
                        if email_sent:
                            emails_sent += 1
                            logger.info(f"Email d'expiration envoyé à {admin.email}")
                
                # Notifier les super admins
                super_admins = User.query.filter_by(is_superadmin=True).all()
                
                for super_admin in super_admins:
                    notification = Notification(
                        user_id=super_admin.id,
                        title="Abonnement client expiré",
                        message=f"L'abonnement de {company.name} a expiré.",
                        type='subscription_expired_admin',
                        data={
                            'company_id': company.id,
                            'expiration_date': company.subscription_end_date.isoformat(),
                            'subscription_plan': company.subscription_plan
                        },
                        priority='high'
                    )
                    db.session.add(notification)
                    notifications_created += 1
            
            # Gérer les abonnements sur le point d'expirer
            elif days_remaining in thresholds:
                logger.info(f"Abonnement de {company.name} expire dans {days_remaining} jours")
                
                # Trouver les administrateurs de l'entreprise pour les notifier
                admins = User.query.filter_by(company_id=company.id, role='admin').all()
                
                # Formatage de la date d'expiration pour l'email
                expiration_date = company.subscription_end_date.strftime("%d/%m/%Y")
                
                # URL pour le renouvellement
                renewal_url = f"{frontend_url}/subscription/renew?company_id={company.id}"
                
                for admin in admins:
                    # Créer une notification interne
                    notification = Notification(
                        user_id=admin.id,
                        title="Expiration d'abonnement",
                        message=f"L'abonnement de votre entreprise expire dans {days_remaining} jours.",
                        type='subscription_expiring_soon',
                        data={
                            'company_id': company.id,
                            'days_remaining': days_remaining,
                            'expiration_date': company.subscription_end_date.isoformat(),
                            'subscription_plan': company.subscription_plan,
                            'renewal_url': renewal_url
                        },
                        priority='high' if days_remaining <= 7 else 'medium'
                    )
                    db.session.add(notification)
                    notifications_created += 1
                    
                    # Vérifier les préférences de notification par email
                    notification_settings = NotificationSettings.query.filter_by(user_id=admin.id).first()
                    
                    # Envoyer un email si l'utilisateur a activé les notifications par email
                    # et si l'expiration est dans 30, 14, 7 ou 1 jour(s)
                    if notification_settings and notification_settings.email_notifications:
                        # Envoyer des emails uniquement pour certains seuils
                        if days_remaining in [30, 14, 7, 1]:
                            user_name = f"{admin.prenom} {admin.nom}"
                            plan_name = company.subscription_plan or "Standard"
                            
                            # Envoyer l'email d'avertissement
                            email_sent = send_subscription_expiring_soon_email(
                                user_email=admin.email,
                                user_name=user_name,
                                company_name=company.name,
                                plan_name=plan_name,
                                days_remaining=days_remaining,
                                expiration_date=expiration_date,
                                renewal_url=renewal_url
                            )
                            
                            if email_sent:
                                emails_sent += 1
                                logger.info(f"Email d'avertissement envoyé à {admin.email} (J-{days_remaining})")
                
                # Notifier également les super admins si l'expiration est proche (7 jours ou moins)
                if days_remaining <= 7:
                    super_admins = User.query.filter_by(is_superadmin=True).all()
                    
                    for super_admin in super_admins:
                        notification = Notification(
                            user_id=super_admin.id,
                            title="Abonnement client sur le point d'expirer",
                            message=f"L'abonnement de {company.name} expire dans {days_remaining} jours.",
                            type='subscription_expiring_soon_admin',
                            data={
                                'company_id': company.id,
                                'days_remaining': days_remaining,
                                'expiration_date': company.subscription_end_date.isoformat(),
                                'subscription_plan': company.subscription_plan
                            },
                            priority='high' if days_remaining <= 3 else 'medium'
                        )
                        db.session.add(notification)
                        notifications_created += 1
        
        db.session.commit()
        logger.info(f"{notifications_created} notifications d'expiration d'abonnement créées")
        logger.info(f"{emails_sent} emails d'expiration d'abonnement envoyés")
        return True, f"{notifications_created} notifications créées, {emails_sent} emails envoyés"
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur lors de la vérification des abonnements expirants: {str(e)}")
        return False, str(e)
