"""
Service d'envoi d'emails pour l'application PointFlex
"""
from flask import current_app, render_template_string
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Templates HTML pour les emails
SUBSCRIPTION_EXPIRING_SOON_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre abonnement expire bientôt</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4338ca;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 4px 4px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 0 0 4px 4px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
        }
        .btn {
            display: inline-block;
            background-color: #4338ca;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 15px;
        }
        .warning {
            color: #d97706;
            font-weight: bold;
        }
        .company-info {
            margin-top: 15px;
            padding: 15px;
            background-color: #f3f4f6;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Votre abonnement expire bientôt</h1>
        </div>
        <div class="content">
            <p>Bonjour {{ user_name }},</p>
            
            <p>Nous vous informons que l'abonnement de <strong>{{ company_name }}</strong> au plan <strong>{{ plan_name }}</strong> arrive à expiration dans <span class="warning">{{ days_remaining }} jours</span>.</p>
            
            <div class="company-info">
                <p><strong>Détails de l'abonnement :</strong></p>
                <ul>
                    <li>Entreprise : {{ company_name }}</li>
                    <li>Plan actuel : {{ plan_name }}</li>
                    <li>Date d'expiration : {{ expiration_date }}</li>
                </ul>
            </div>
            
            <p>Pour assurer la continuité de vos services, veuillez renouveler votre abonnement avant cette date.</p>
            
            <p>Si votre abonnement expire, certaines fonctionnalités pourraient devenir indisponibles.</p>
            
            <div style="text-align: center;">
                <a href="{{ renewal_url }}" class="btn">Renouveler mon abonnement</a>
            </div>
            
            <p>Si vous avez des questions concernant votre abonnement, n'hésitez pas à contacter notre équipe support.</p>
            
            <p>Cordialement,<br>L'équipe PointFlex</p>
        </div>
        <div class="footer">
            <p>© {{ current_year }} PointFlex - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
"""

SUBSCRIPTION_EXPIRED_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre abonnement a expiré</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 4px 4px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 0 0 4px 4px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
        }
        .btn {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 15px;
        }
        .warning {
            color: #dc2626;
            font-weight: bold;
        }
        .company-info {
            margin-top: 15px;
            padding: 15px;
            background-color: #f3f4f6;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Votre abonnement a expiré</h1>
        </div>
        <div class="content">
            <p>Bonjour {{ user_name }},</p>
            
            <p>Nous vous informons que l'abonnement de <strong>{{ company_name }}</strong> au plan <strong>{{ plan_name }}</strong> <span class="warning">a expiré</span>.</p>
            
            <div class="company-info">
                <p><strong>Détails de l'abonnement :</strong></p>
                <ul>
                    <li>Entreprise : {{ company_name }}</li>
                    <li>Plan : {{ plan_name }}</li>
                    <li>Date d'expiration : {{ expiration_date }}</li>
                </ul>
            </div>
            
            <p>Certaines fonctionnalités ne sont plus disponibles pour votre compte. Pour restaurer l'accès complet, veuillez renouveler votre abonnement dès maintenant.</p>
            
            <div style="text-align: center;">
                <a href="{{ renewal_url }}" class="btn">Renouveler mon abonnement</a>
            </div>
            
            <p>Si vous avez des questions concernant votre abonnement, n'hésitez pas à contacter notre équipe support.</p>
            
            <p>Cordialement,<br>L'équipe PointFlex</p>
        </div>
        <div class="footer">
            <p>© {{ current_year }} PointFlex - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
"""

def send_email(recipients: List[str], 
              subject: str, 
              html_content: str,
              cc: Optional[List[str]] = None,
              bcc: Optional[List[str]] = None) -> bool:
    """
    Envoie un email aux destinataires spécifiés
    
    Args:
        recipients: Liste des adresses email des destinataires
        subject: Sujet de l'email
        html_content: Contenu HTML de l'email
        cc: Liste des adresses email en copie
        bcc: Liste des adresses email en copie cachée
        
    Returns:
        bool: True si l'email a été envoyé avec succès, False sinon
    """
    try:
        # Récupérer les configurations SMTP depuis les variables d'environnement
        smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        smtp_username = current_app.config.get('SMTP_USERNAME')
        smtp_password = current_app.config.get('SMTP_PASSWORD')
        sender_email = current_app.config.get('SENDER_EMAIL', smtp_username)
        
        # Vérifier si les configurations SMTP sont définies
        if not all([smtp_server, smtp_port, smtp_username, smtp_password]):
            logger.error("Configuration SMTP incomplète. Impossible d'envoyer l'email.")
            return False
            
        # Créer le message
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = sender_email
        message['To'] = ', '.join(recipients)
        
        if cc:
            message['Cc'] = ', '.join(cc)
        if bcc:
            message['Bcc'] = ', '.join(bcc)
            
        # Ajouter le contenu HTML
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Établir une connexion sécurisée au serveur SMTP
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        # Envoyer l'email
        all_recipients = recipients.copy()
        if cc:
            all_recipients.extend(cc)
        if bcc:
            all_recipients.extend(bcc)
            
        server.sendmail(sender_email, all_recipients, message.as_string())
        server.quit()
        
        logger.info(f"Email envoyé avec succès à {', '.join(recipients)}")
        return True
        
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'email: {str(e)}")
        return False

def render_email_template(template: str, context: Dict[str, Any]) -> str:
    """
    Rendre un template d'email avec le contexte donné
    
    Args:
        template: Template HTML à rendre
        context: Dictionnaire des variables de contexte
        
    Returns:
        str: Le template rendu avec le contexte
    """
    try:
        return render_template_string(template, **context)
    except Exception as e:
        logger.error(f"Erreur lors du rendu du template d'email: {str(e)}")
        return ""

def send_subscription_expiring_soon_email(user_email: str, 
                                         user_name: str, 
                                         company_name: str, 
                                         plan_name: str,
                                         days_remaining: int,
                                         expiration_date: str,
                                         renewal_url: str) -> bool:
    """
    Envoie un email de notification d'expiration d'abonnement
    
    Args:
        user_email: Adresse email de l'utilisateur
        user_name: Nom de l'utilisateur
        company_name: Nom de l'entreprise
        plan_name: Nom du plan d'abonnement
        days_remaining: Nombre de jours restants avant expiration
        expiration_date: Date d'expiration formatée
        renewal_url: URL pour le renouvellement de l'abonnement
        
    Returns:
        bool: True si l'email a été envoyé avec succès, False sinon
    """
    from datetime import datetime
    
    # Préparer le contexte
    context = {
        "user_name": user_name,
        "company_name": company_name,
        "plan_name": plan_name,
        "days_remaining": days_remaining,
        "expiration_date": expiration_date,
        "renewal_url": renewal_url,
        "current_year": datetime.now().year
    }
    
    # Rendre le template
    html_content = render_email_template(SUBSCRIPTION_EXPIRING_SOON_TEMPLATE, context)
    if not html_content:
        return False
        
    # Envoyer l'email
    subject = f"Votre abonnement expire dans {days_remaining} jours"
    return send_email([user_email], subject, html_content)

def send_subscription_expired_email(user_email: str, 
                                   user_name: str, 
                                   company_name: str, 
                                   plan_name: str,
                                   expiration_date: str,
                                   renewal_url: str) -> bool:
    """
    Envoie un email de notification d'abonnement expiré
    
    Args:
        user_email: Adresse email de l'utilisateur
        user_name: Nom de l'utilisateur
        company_name: Nom de l'entreprise
        plan_name: Nom du plan d'abonnement
        expiration_date: Date d'expiration formatée
        renewal_url: URL pour le renouvellement de l'abonnement
        
    Returns:
        bool: True si l'email a été envoyé avec succès, False sinon
    """
    from datetime import datetime
    
    # Préparer le contexte
    context = {
        "user_name": user_name,
        "company_name": company_name,
        "plan_name": plan_name,
        "expiration_date": expiration_date,
        "renewal_url": renewal_url,
        "current_year": datetime.now().year
    }
    
    # Rendre le template
    html_content = render_email_template(SUBSCRIPTION_EXPIRED_TEMPLATE, context)
    if not html_content:
        return False
        
    # Envoyer l'email
    subject = f"IMPORTANT : Votre abonnement a expiré"
    return send_email([user_email], subject, html_content)
