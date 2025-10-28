"""
Modèle Pointage - Gestion des pointages
"""

from backend.database import db
from datetime import datetime, time
from zoneinfo import ZoneInfo
from backend.models.system_settings import SystemSettings

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
    accuracy = db.Column(db.Float, nullable=True)
    altitude = db.Column(db.Float, nullable=True)
    heading = db.Column(db.Float, nullable=True)
    speed = db.Column(db.Float, nullable=True)
    
    # Référence au bureau (pour pointage bureau)
    office_id = db.Column(db.Integer, db.ForeignKey('offices.id'), nullable=True)
    distance = db.Column(db.Float, nullable=True)  # Distance au bureau en mètres
    
    # Mission (pour pointage mission)
    mission_id = db.Column(db.Integer, db.ForeignKey('missions.id'), nullable=True)
    mission_order_number = db.Column(db.String(100), nullable=True)

    # Indique si l'heure d'arrivée a été égalisée au début de journée
    is_equalized = db.Column(db.Boolean, default=False)
    
    # Mode de pointage
    is_qr_scan = db.Column(db.Boolean, default=False)
    is_offline = db.Column(db.Boolean, default=False)
    sync_status = db.Column(db.String(20), default='synced')  # 'synced', 'pending', 'failed'
    offline_timestamp = db.Column(db.DateTime, nullable=True)
    device_id = db.Column(db.String(255), nullable=True)
    
    # Justification des retards
    delay_reason = db.Column(db.String(100), nullable=True)
    delay_category = db.Column(db.String(50), nullable=True)  # 'transport', 'personnel', 'médical', etc.
    is_justified = db.Column(db.Boolean, default=False)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    office = db.relationship('Office', backref='pointages', lazy=True)
    mission = db.relationship('Mission', backref='pointages', lazy=True)
    
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
        """Calcule le statut du pointage (présent/retard) en tenant compte du fuseau horaire"""
        from backend.models.user import User

        user = User.query.get(self.user_id)
        if not user or not user.company:
            self.statut = 'present'
            return

        company = user.company
        work_start = company.work_start_time or time(9, 0)  # 9h par défaut
        late_threshold = company.late_threshold or 15  # 15 min par défaut

        # Déterminer le fuseau horaire à utiliser
        tz_name = 'UTC'
        if self.office and self.office.timezone:
            tz_name = self.office.timezone
        else:
            tz_name = SystemSettings.get_setting('general', 'default_timezone', 'UTC')

        tz = ZoneInfo(tz_name)

        # Convertir l'heure d'arrivée UTC vers le fuseau local
        arrival_dt_utc = datetime.combine(self.date_pointage, self.heure_arrivee, tzinfo=ZoneInfo('UTC'))
        arrival_local = arrival_dt_utc.astimezone(tz)

        arrival_minutes = arrival_local.hour * 60 + arrival_local.minute
        work_start_minutes = work_start.hour * 60 + work_start.minute

        # Calculer le retard en minutes
        delay_minutes = arrival_minutes - work_start_minutes

        if delay_minutes <= late_threshold:
            self.statut = 'present'
        else:
            self.statut = 'retard'

        # Appliquer l'égalisation si configurée
        equal_thresh = getattr(company, 'equalization_threshold', 0)
        if 0 < delay_minutes <= equal_thresh:
            self.heure_arrivee = datetime.combine(self.date_pointage, work_start, tzinfo=tz).astimezone(ZoneInfo('UTC')).time()
            self.is_equalized = True
    
    def calculate_worked_hours(self):
        """Calcule les heures travaillées en soustrayant les pauses"""
        if not self.heure_depart:
            return None

        start_minutes = self.heure_arrivee.hour * 60 + self.heure_arrivee.minute
        end_minutes = self.heure_depart.hour * 60 + self.heure_depart.minute

        if end_minutes < start_minutes:
            end_minutes += 24 * 60

        worked_minutes = end_minutes - start_minutes
        
        # Calcul des pauses avec gestion d'erreur
        try:
            # Vérifier si self.pauses existe et n'est pas None
            if hasattr(self, 'pauses') and self.pauses is not None:
                pause_minutes = sum(p.duration_minutes or 0 for p in self.pauses)
            else:
                # Récupérer les pauses manuellement si la relation ne fonctionne pas
                from backend.models.pause import Pause
                pauses = Pause.query.filter_by(pointage_id=self.id).all()
                pause_minutes = sum(p.duration_minutes or 0 for p in pauses)
        except Exception as e:
            # En cas d'erreur, logger et ignorer les pauses
            import logging
            logging.warning(f"Erreur lors du calcul des pauses pour le pointage {self.id}: {str(e)}")
            pause_minutes = 0
            
        worked_minutes -= pause_minutes
        worked_minutes = max(0, worked_minutes)

        return round(worked_minutes / 60, 2)
    
    @property
    def delay_minutes(self):
        """Retourne le retard en minutes en tenant compte du fuseau horaire"""
        if not self.user or not self.user.company:
            return 0

        work_start = self.user.company.work_start_time or time(9, 0)

        tz_name = 'UTC'
        if self.office and self.office.timezone:
            tz_name = self.office.timezone
        else:
            tz_name = SystemSettings.get_setting('general', 'default_timezone', 'UTC')

        tz = ZoneInfo(tz_name)
        arrival_dt_utc = datetime.combine(self.date_pointage, self.heure_arrivee, tzinfo=ZoneInfo('UTC'))
        arrival_local = arrival_dt_utc.astimezone(tz)
        arrival_minutes = arrival_local.hour * 60 + arrival_local.minute
        work_start_minutes = work_start.hour * 60 + work_start.minute

        delay = arrival_minutes - work_start_minutes
        return max(0, delay)
    
    def to_dict(self):
        """Convertit le pointage en dictionnaire"""
        worked_hours = self.calculate_worked_hours()
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.prenom} {self.user.nom}" if self.user else None,
            'type': self.type,
            'date_pointage': self.date_pointage.isoformat(),
            'heure_arrivee': self.heure_arrivee.strftime('%H:%M'),
            'heure_depart': self.heure_depart.strftime('%H:%M') if self.heure_depart else None,
            'statut': self.statut,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'accuracy': self.accuracy,
            'altitude': self.altitude,
            'heading': self.heading,
            'speed': self.speed,
            'offline_timestamp': self.offline_timestamp.isoformat() if self.offline_timestamp else None,
            'device_id': self.device_id,
            'office_id': self.office_id,
            'distance': self.distance,
            'mission_id': self.mission_id,
            'mission_order_number': self.mission.order_number if self.mission else self.mission_order_number,
            'worked_hours': worked_hours,
            'worked_hours_adjusted': worked_hours,
            'delay_minutes': self.delay_minutes,
            'is_equalized': self.is_equalized,
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