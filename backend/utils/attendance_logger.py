"""
Module de journalisation pour les opérations de pointage
"""
import os
import logging
from datetime import datetime

# Configurer le logger pour les pointages
logger = logging.getLogger('attendance_logger')
logger.setLevel(logging.DEBUG)

# Créer le dossier de logs s'il n'existe pas
logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configurer un gestionnaire de fichiers pour les logs de pointage
log_file = os.path.join(logs_dir, f'attendance_{datetime.now().strftime("%Y%m%d")}.log')
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.DEBUG)

# Format des messages
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

def log_attendance_event(event_type, user_id=None, details=None):
    """
    Enregistre un événement de pointage dans le fichier journal
    
    Args:
        event_type: Type d'événement (checkin, checkout, etc.)
        user_id: ID de l'utilisateur concerné
        details: Détails supplémentaires de l'événement (dict)
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        "user_id": user_id,
        "details": details or {}
    }
    
    logger.info(f"ATTENDANCE EVENT: {event_type} - User: {user_id} - Details: {details}")
    return log_entry

def log_attendance_error(error_type, user_id=None, error_details=None):
    """
    Enregistre une erreur de pointage dans le fichier journal
    
    Args:
        error_type: Type d'erreur
        user_id: ID de l'utilisateur concerné
        error_details: Détails de l'erreur
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "error": error_type,
        "user_id": user_id,
        "details": error_details or {}
    }
    
    logger.error(f"ATTENDANCE ERROR: {error_type} - User: {user_id} - Details: {error_details}")
    return log_entry
