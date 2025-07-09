"""
Modèle Company - Gestion des entreprises
"""

from backend.database import db
from datetime import datetime, timedelta

class Company(db.Model):
    """Modèle pour les entreprises (multi-tenant)"""
    
    __tablename__ = 'companies'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(2), nullable=True)  # Code ISO à 2 lettres
    industry = db.Column(db.String(50), nullable=True)
    website = db.Column(db.String(200), nullable=True)
    tax_id = db.Column(db.String(50), nullable=True)  # SIRET, TVA, etc.
    notes = db.Column(db.Text, nullable=True)
    
    # Abonnement et limites
    subscription_plan = db.Column(db.String(50), default='basic', nullable=False)  # basic, premium, enterprise
    subscription_status = db.Column(db.String(50), default='active', nullable=False)  # active, suspended, expired
    subscription_start = db.Column(db.Date, default=datetime.utcnow().date)
    subscription_end = db.Column(db.Date, nullable=True)
    max_employees = db.Column(db.Integer, default=10, nullable=False)
    
    # Paramètres de pointage
    office_latitude = db.Column(db.Float, default=48.8566)  # Paris par défaut
    office_longitude = db.Column(db.Float, default=2.3522)
    # Rayon par défaut autorisé autour du siège (en mètres)
    office_radius = db.Column(db.Integer, default=200)
    work_start_time = db.Column(db.Time, default=datetime.strptime('09:00', '%H:%M').time())
    late_threshold = db.Column(db.Integer, default=15)  # minutes
    # Minutes de tolérance pour l'égalisation de l'heure d'arrivée
    equalization_threshold = db.Column(db.Integer, default=0)

    # Personnalisation d'entreprise
    logo_url = db.Column(db.String(255), nullable=True)
    theme_color = db.Column(db.String(20), default='#3b82f6')  # bleu par défaut
    
    # Statut et métadonnées
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_suspended = db.Column(db.Boolean, default=False, nullable=False)
    suspension_reason = db.Column(db.Text, nullable=True)
    stripe_customer_id = db.Column(db.String(255), nullable=True) # Stripe Customer ID
    stripe_subscription_id = db.Column(db.String(255), nullable=True) # Stripe Subscription ID
    active_stripe_price_id = db.Column(db.String(255), nullable=True) # Active Stripe Price ID for the current subscription

    # Leave Policy Configuration
    # Stores work days as a comma-separated string of integers e.g., "0,1,2,3,4" for Mon-Fri
    work_days = db.Column(db.String(20), default="0,1,2,3,4")
    # Default country for national holidays from 'holidays' library, e.g., "FR", "US"
    default_country_code_for_holidays = db.Column(db.String(10), default="FR")

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        """Initialisation avec configuration par défaut de l'abonnement"""
        super(Company, self).__init__(**kwargs)
        
        # Définir la date de fin d'abonnement si pas spécifiée
        if not self.subscription_end:
            self.subscription_end = (datetime.utcnow() + timedelta(days=30)).date()
    
    @property
    def current_employee_count(self):
        """Retourne le nombre actuel d'employés actifs"""
        return len([user for user in self.users if user.is_active])
    
    @property
    def can_add_employee(self):
        """Vérifie si l'entreprise peut ajouter un employé"""
        return self.current_employee_count < self.max_employees
    
    @property
    def subscription_days_remaining(self):
        """Retourne le nombre de jours restants d'abonnement"""
        if not self.subscription_end:
            return None
        
        today = datetime.utcnow().date()
        if self.subscription_end > today:
            return (self.subscription_end - today).days
        return 0
    
    @property
    def is_subscription_expired(self):
        """Vérifie si l'abonnement a expiré"""
        if not self.subscription_end:
            return False
        return datetime.utcnow().date() > self.subscription_end
    
    @property
    def is_subscription_expiring_soon(self):
        """Vérifie si l'abonnement expire dans les 7 jours"""
        days_remaining = self.subscription_days_remaining
        return days_remaining is not None and 0 < days_remaining <= 7
    
    def extend_subscription(self, months=1):
        """Prolonge l'abonnement de X mois"""
        if self.subscription_end:
            # Si l'abonnement est déjà expiré, partir d'aujourd'hui
            start_date = max(self.subscription_end, datetime.utcnow().date())
        else:
            start_date = datetime.utcnow().date()
        
        # Ajouter les mois (approximation de 30 jours par mois)
        self.subscription_end = start_date + timedelta(days=months * 30)
        
        # Réactiver si suspendu pour expiration
        if self.subscription_status == 'expired':
            self.subscription_status = 'active'
            self.is_suspended = False
            self.suspension_reason = None
    
    def suspend(self, reason="Suspension administrative"):
        """Suspend l'entreprise"""
        self.is_suspended = True
        self.subscription_status = 'suspended'
        self.suspension_reason = reason
    
    def reactivate(self):
        """Réactive l'entreprise"""
        self.is_suspended = False
        self.subscription_status = 'active'
        self.suspension_reason = None
    
    def get_plan_limits(self):
        """Retourne les limites selon le plan d'abonnement"""
        plans = {
            'basic': {'max_employees': 10, 'features': ['pointage_basic']},
            'premium': {'max_employees': 50, 'features': ['pointage_basic', 'rapports', 'geofencing']},
            'enterprise': {'max_employees': 999, 'features': ['pointage_basic', 'rapports', 'geofencing', 'api', 'sso']}
        }
        return plans.get(self.subscription_plan, plans['basic'])
    
    def to_dict(self, include_sensitive=False):
        """Convertit l'entreprise en dictionnaire"""
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'industry': self.industry,
            'website': self.website,
            'tax_id': self.tax_id,
            'logo_url': self.logo_url,
            'theme_color': self.theme_color,
            'subscription_plan': self.subscription_plan,
            'subscription_status': self.subscription_status,
            'max_employees': self.max_employees,
            'current_employee_count': self.current_employee_count,
            'is_active': self.is_active,
            'is_suspended': self.is_suspended,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_sensitive:
            data.update({
                'subscription_start': self.subscription_start.isoformat() if self.subscription_start else None,
                'subscription_end': self.subscription_end.isoformat() if self.subscription_end else None,
                'subscription_days_remaining': self.subscription_days_remaining,
                'is_subscription_expired': self.is_subscription_expired,
                'is_subscription_expiring_soon': self.is_subscription_expiring_soon,
                'suspension_reason': self.suspension_reason,
                'office_latitude': self.office_latitude,
                'office_longitude': self.office_longitude,
                'office_radius': self.office_radius,
                'work_start_time': self.work_start_time.strftime('%H:%M') if self.work_start_time else None,
                'late_threshold': self.late_threshold,
                'equalization_threshold': self.equalization_threshold,
                'work_days': self.work_days, # Add new leave policy fields
                'default_country_code_for_holidays': self.default_country_code_for_holidays, # Add new leave policy fields
                'plan_limits': self.get_plan_limits(),
                'notes': self.notes
            })
        
        return data
    
    def __repr__(self):
        return f'<Company {self.name}>'