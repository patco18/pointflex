from backend.database import db
from datetime import datetime

class MissionUser(db.Model):
    """Association users <-> missions"""
    __tablename__ = 'mission_users'
    id = db.Column(db.Integer, primary_key=True)
    mission_id = db.Column(db.Integer, db.ForeignKey('missions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(
        db.Enum('pending', 'accepted', 'declined', name='mission_user_status'),
        default='pending',
        nullable=False
    )
    responded_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref='mission_links', lazy=True)
    mission = db.relationship('Mission', back_populates='users', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'mission_id': self.mission_id,
            'user_id': self.user_id,
            'status': self.status,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'user': self.user.to_dict() if self.user else None
        }
