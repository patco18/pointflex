"""
Modèle Company - Gestion des entreprises
"""

from backend.database import db
from backend.config import Config
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
    # ATTENTION: Cette colonne n'existe pas dans la base de données
    # La migration n'a pas fonctionné, nous la commentons complètement
    # subscription_plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=True)
    subscription_status = db.Column(db.String(50), default='active', nullable=False)  # active, suspended, expired
    subscription_start = db.Column(db.Date, default=datetime.utcnow().date)
    subscription_end = db.Column(db.Date, nullable=True)
    max_employees = db.Column(db.Integer, default=10, nullable=False)
    
    # Relation avec le plan d'abonnement - Commentée car la colonne n'existe pas
    # subscription_plan_rel = db.relationship('SubscriptionPlan', foreign_keys=[subscription_plan_id])
    
    @property
    def get_subscription_plan(self):
        """Récupère l'objet de plan d'abonnement associé à cette entreprise si disponible"""
        try:
            from backend.models.subscription_plan import SubscriptionPlan
            if hasattr(self, 'subscription_plan_id') and self.subscription_plan_id:
                return SubscriptionPlan.query.get(self.subscription_plan_id)
            elif self.subscription_plan:
                # Tenter de trouver par nom
                return SubscriptionPlan.query.filter_by(name=self.subscription_plan).first()
        except Exception:
            pass
        return None
    
    # Paramètres de pointage
    office_latitude = db.Column(db.Float, default=48.8566)  # Paris par défaut
    office_longitude = db.Column(db.Float, default=2.3522)
    # Rayon par défaut autorisé autour du siège (en mètres)
    office_radius = db.Column(db.Integer, default=200)
    # Précision maximale de la géolocalisation en mètres
    geolocation_max_accuracy = db.Column(db.Integer, default=Config.GEOLOCATION_MAX_ACCURACY)
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
    def subscription_end_date(self):
        """Alias pour subscription_end pour rétrocompatibilité"""
        return self.subscription_end
    
    @property
    def subscription_start_date(self):
        """Alias pour subscription_start pour rétrocompatibilité"""
        return self.subscription_start
    
    @property
    def subscription_trial(self):
        """Indique si l'abonnement est en période d'essai (moins de 30 jours depuis le début)"""
        if not self.subscription_start:
            return False
        days_since_start = (datetime.utcnow().date() - self.subscription_start).days
        return days_since_start <= 30 and self.subscription_status != 'expired'
        
    @property
    def subscription_amount(self):
        """Montant de l'abonnement"""
        try:
            # Essayer de récupérer le plan correspondant dans la base de données
            from backend.models.subscription_plan import SubscriptionPlan
            plan = SubscriptionPlan.query.filter_by(
                name=self.subscription_plan.capitalize(),
                duration_months=1
            ).first()
            
            if plan:
                return float(plan.price)
            
            # Fallback sur les noms de plan alternatifs
            alternate_names = {
                'basic': ['starter', 'basic'],
                'premium': ['standard', 'premium'],
                'enterprise': ['professional', 'enterprise']
            }
            
            for category, names in alternate_names.items():
                if self.subscription_plan.lower() in names:
                    plan = SubscriptionPlan.query.filter(
                        SubscriptionPlan.name.in_([name.capitalize() for name in names]),
                        SubscriptionPlan.duration_months == 1
                    ).first()
                    if plan:
                        return float(plan.price)
            
            # Tarifs par défaut si rien n'est trouvé dans la base de données
            default_prices = {
                'basic': 29.0,
                'premium': 99.0,
                'enterprise': 299.0,
                'starter': 29.99,
                'standard': 49.99
            }
            return default_prices.get(self.subscription_plan.lower(), 0)
            
        except Exception as e:
            # En cas d'erreur, retourner les prix par défaut
            default_prices = {
                'basic': 29.0,
                'premium': 99.0,
                'enterprise': 299.0,
                'starter': 29.99,
                'standard': 49.99
            }
            return default_prices.get(self.subscription_plan.lower(), 0)
    
    @property
    def subscription_auto_renew(self):
        """Si l'abonnement se renouvelle automatiquement"""
        # Par défaut, considérer que le renouvellement est automatique si un ID Stripe est défini
        return bool(self.stripe_subscription_id)
    
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
        # La colonne subscription_plan_id n'existe pas, nous utilisons uniquement les plans statiques définis ci-dessous
        
        # Fallback sur les plans statiques si pas de plan dynamique ou erreur
        plans = {
            'basic': {'max_employees': 10, 'features': ['pointage_basic']},
            'premium': {'max_employees': 50, 'features': ['pointage_basic', 'rapports', 'geofencing']},
            'enterprise': {'max_employees': 999, 'features': ['pointage_basic', 'rapports', 'geofencing', 'api', 'sso']}
        }
        return plans.get(self.subscription_plan, plans['basic'])
    
    def to_dict(self, include_sensitive=False):
        """Convertit l'entreprise en dictionnaire"""
        # Nous n'avons plus accès aux informations détaillées du plan d'abonnement
        subscription_plan_info = None
        
        # Tenter de récupérer l'ID du plan d'abonnement si disponible
        subscription_plan_id = getattr(self, 'subscription_plan_id', None)
        
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
            'subscription_plan_id': subscription_plan_id,  # Utiliser la valeur récupérée
            'subscription_plan_info': subscription_plan_info,
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
                'geolocation_max_accuracy': self.geolocation_max_accuracy,
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