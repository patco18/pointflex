from backend.database import db
from datetime import datetime

class Pause(db.Model):
    """Model for user breaks/pause"""
    __tablename__ = 'pauses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date_pause = db.Column(db.Date, default=datetime.utcnow().date, nullable=False)
    start_time = db.Column(db.Time, default=datetime.utcnow().time, nullable=False)
    end_time = db.Column(db.Time, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref='pauses', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.prenom} {self.user.nom}" if self.user else None,
            'date_pause': self.date_pause.isoformat(),
            'start_time': self.start_time.strftime('%H:%M'),
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

