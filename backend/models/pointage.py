"""
Modèle Pointage - Gestion des pointages
"""

from database import db
from datetime import datetime, time

class Pointage(db.Model):
    """Modèle pour les pointages des employés"""
    
    __tablename__ = 'pointages'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Type de pointage
    type = db.Column(db.String(20), nullable=False)  # 'office' ou 'mission'
    
    # Informations temporelles
    date_pointage = db.Column(db.Date, default=datetime.utcnow().date, nullable=False)
    heure_arrivee = db.Column(db.Time, default=datetime.utcnow().time, nullable=False)
    heure_depart = db.Column(db.Time, nullable=True)
    
    # Statut
    statut = db.Column(db.String(20), default='present', nullable=False)  # present, retard, absent
    
    # Géolocalisation
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    # Référence au bureau (pour pointage bureau)
    office_id = db.Column(db.Integer, db.ForeignKey('offices.id'), nullable=True)
    distance = db.Column(db.Float, nullable=True)  # Distance au bureau en mètres
    
    # Mission (pour pointage mission)
    mission_order_number = db.Column(db.String(100), nullable=True)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    office = db.relationship('Office', backref='pointages', lazy=True)
    
    def __init__(self, **kwargs):
        """Initialisation avec calcul automatique du statut"""
        # S'assurer que les valeurs par défaut sont appliquées
        kwargs.setdefault('heure_arrivee', datetime.utcnow().time())
        kwargs.setdefault('date_pointage', datetime.utcnow().date())

        super(Pointage, self).__init__(**kwargs)

        # Calculer le statut si pas défini
        if not getattr(self, 'statut', None):
            self.calculate_status()
    
    def calculate_status(self):
        """Calcule le statut du pointage (présent/retard)"""
        from models.user import User
        
        user = User.query.get(self.user_id)
        if not user or not user.company:
            self.statut = 'present'
            return
        
        company = user.company
        work_start = company.work_start_time or time(9, 0)  # 9h par défaut
        late_threshold = company.late_threshold or 15  # 15 min par défaut
        
        # Convertir l'heure d'arrivée en minutes depuis minuit
        arrival_minutes = self.heure_arrivee.hour * 60 + self.heure_arrivee.minute
        work_start_minutes = work_start.hour * 60 + work_start.minute
        
        # Calculer le retard en minutes
        delay_minutes = arrival_minutes - work_start_minutes
        
        if delay_minutes <= late_threshold:
            self.statut = 'present'
        else:
            self.statut = 'retard'
    
    def calculate_worked_hours(self):
        """Calcule les heures travaillées si heure de départ renseignée"""
        if not self.heure_depart:
            return None
        
        # Convertir en minutes
        start_minutes = self.heure_arrivee.hour * 60 + self.heure_arrivee.minute
        end_minutes = self.heure_depart.hour * 60 + self.heure_depart.minute
        
        # Gérer le cas où le départ est le lendemain
        if end_minutes < start_minutes:
            end_minutes += 24 * 60
        
        worked_minutes = end_minutes - start_minutes
        return round(worked_minutes / 60, 2)  # Retourner en heures
    
    @property
    def delay_minutes(self):
        """Retourne le retard en minutes"""
        if not self.user or not self.user.company:
            return 0
        
        work_start = self.user.company.work_start_time or time(9, 0)
        arrival_minutes = self.heure_arrivee.hour * 60 + self.heure_arrivee.minute
        work_start_minutes = work_start.hour * 60 + work_start.minute
        
        delay = arrival_minutes - work_start_minutes
        return max(0, delay)
    
    def to_dict(self):
        """Convertit le pointage en dictionnaire"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'date_pointage': self.date_pointage.isoformat(),
            'heure_arrivee': self.heure_arrivee.strftime('%H:%M'),
            'heure_depart': self.heure_depart.strftime('%H:%M') if self.heure_depart else None,
            'statut': self.statut,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'office_id': self.office_id,
            'distance': self.distance,
            'mission_order_number': self.mission_order_number,
            'worked_hours': self.calculate_worked_hours(),
            'delay_minutes': self.delay_minutes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # Ajouter les informations du bureau si disponible
        if self.office:
            data['office'] = {
                'id': self.office.id,
                'name': self.office.name,
                'address': self.office.address,
                'city': self.office.city
            }
        
        return data
    
    def __repr__(self):
        return f'<Pointage {self.user_id} - {self.date_pointage} - {self.type}>'