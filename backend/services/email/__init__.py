"""
Module d'initialisation pour le service d'email
"""
from .email_service import (
    send_email,
    render_email_template,
    send_subscription_expiring_soon_email,
    send_subscription_expired_email
)

__all__ = [
    'send_email',
    'render_email_template',
    'send_subscription_expiring_soon_email',
    'send_subscription_expired_email'
]
