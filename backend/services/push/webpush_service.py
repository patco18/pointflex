"""
Service pour l'envoi de notifications push via Web Push API
"""

import json
import logging
from typing import Dict, Any, Optional, List
from flask import current_app

from backend.models.push_subscription import PushSubscription
from backend.database import db

try:  # pragma: no cover - behaviour verified via send_web_push guard
    from pywebpush import webpush as _webpush, WebPushException as _WebPushException
except Exception:  # ImportError, ModuleNotFoundError, etc.
    _webpush = None

    class _WebPushException(Exception):
        """Fallback exception used when pywebpush isn't available."""


def _webpush_available() -> bool:
    """Return True if pywebpush could be imported."""
    return _webpush is not None

logger = logging.getLogger(__name__)

def send_web_push(subscription_info: Dict[str, Any], data: Dict[str, Any]) -> bool:
    """
    Envoie une notification web push à un seul abonnement
    
    Args:
        subscription_info: Informations d'abonnement au format Web Push
        data: Données à envoyer dans la notification
    
    Returns:
        bool: True si l'envoi a réussi, False sinon
    """
    if not _webpush_available():
        logger.error("pywebpush n'est pas disponible. Impossible d'envoyer une notification Web Push.")
        return False

    try:
        # Vérifier si les clés VAPID sont configurées
        if not current_app.config.get('VAPID_PRIVATE_KEY'):
            logger.error("VAPID_PRIVATE_KEY n'est pas configurée")
            return False
            
        if not current_app.config.get('VAPID_CLAIMS'):
            logger.error("VAPID_CLAIMS n'est pas configuré")
            return False
        
        # Envoyer la notification
        response = _webpush(
            subscription_info=subscription_info,
            data=json.dumps(data),
            vapid_private_key=current_app.config['VAPID_PRIVATE_KEY'],
            vapid_claims=current_app.config['VAPID_CLAIMS']
        )

        logger.info(f"Notification push envoyée avec succès: {response.status_code}")
        return True
    except _WebPushException as e:
        logger.error(f"Erreur lors de l'envoi de notification push: {e}")
        
        # Si l'erreur est due à une expiration de l'abonnement, le marquer comme inactif
        if e.response and e.response.status_code == 410:  # Gone - l'abonnement n'est plus valide
            logger.warning("Abonnement expiré, marquage comme inactif")
            # Le token sera dans la base de données, pas dans subscription_info
            # Cette logique devrait être gérée par la fonction appelante
        return False
    except Exception as e:
        logger.error(f"Erreur inattendue lors de l'envoi de notification push: {e}")
        return False

def send_push_to_user(user_id: int, title: str, body: str, 
                      icon: Optional[str] = None, 
                      action_url: Optional[str] = None,
                      data: Optional[Dict[str, Any]] = None) -> int:
    """
    Envoie une notification push à tous les appareils enregistrés d'un utilisateur
    
    Args:
        user_id: ID de l'utilisateur
        title: Titre de la notification
        body: Contenu de la notification
        icon: URL de l'icône à afficher (optionnel)
        action_url: URL à ouvrir lorsque l'utilisateur clique sur la notification (optionnel)
        data: Données supplémentaires à inclure dans la notification (optionnel)
    
    Returns:
        int: Nombre de notifications envoyées avec succès
    """
    # Récupérer tous les abonnements actifs de l'utilisateur
    subscriptions = PushSubscription.query.filter_by(
        user_id=user_id,
        is_active=True,
        device_type='web'  # Ne cibler que les appareils Web pour Web Push
    ).all()
    
    if not subscriptions:
        logger.info(f"Aucun abonnement Web Push actif trouvé pour l'utilisateur {user_id}")
        return 0
    
    # Préparer les données de la notification
    notification_data = {
        "notification": {
            "title": title,
            "body": body,
            "icon": icon or "/logo192.png",
        }
    }
    
    if action_url:
        notification_data["notification"]["data"] = {"url": action_url}
    
    if data:
        notification_data["data"] = data
    
    success_count = 0
    
    for subscription in subscriptions:
        try:
            # Récupérer l'objet d'abonnement Web Push à partir du modèle mis à jour
            subscription_info = subscription.get_web_push_subscription()
            
            if not subscription_info:
                logger.error(f"Pas de données d'abonnement Web Push valides pour l'ID {subscription.id}")
                subscription.is_active = False
                db.session.add(subscription)
                continue
            
            success = send_web_push(subscription_info, notification_data)
            if success:
                success_count += 1
            else:
                # Marquer l'abonnement comme inactif en cas d'échec
                subscription.is_active = False
                db.session.add(subscription)
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de notification à l'abonnement ID {subscription.id}: {str(e)}")
            subscription.is_active = False
            db.session.add(subscription)
    
    # Sauvegarder les changements pour les abonnements désactivés
    if success_count < len(subscriptions):
        try:
            db.session.commit()
        except Exception as e:
            logger.error(f"Erreur lors de la désactivation des abonnements: {e}")
            db.session.rollback()
    
    return success_count

def send_push_to_users(user_ids: List[int], title: str, body: str, 
                       icon: Optional[str] = None, 
                       action_url: Optional[str] = None,
                       data: Optional[Dict[str, Any]] = None) -> Dict[int, int]:
    """
    Envoie une notification push à plusieurs utilisateurs
    
    Args:
        user_ids: Liste des IDs d'utilisateurs
        title: Titre de la notification
        body: Contenu de la notification
        icon: URL de l'icône à afficher (optionnel)
        action_url: URL à ouvrir lorsque l'utilisateur clique sur la notification (optionnel)
        data: Données supplémentaires à inclure dans la notification (optionnel)
    
    Returns:
        Dict[int, int]: Dictionnaire avec les IDs d'utilisateurs comme clés et le nombre de notifications
                      envoyées à chaque utilisateur comme valeurs
    """
    results = {}
    for user_id in user_ids:
        sent_count = send_push_to_user(user_id, title, body, icon, action_url, data)
        results[user_id] = sent_count
    
    return results
