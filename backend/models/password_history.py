"""
PasswordHistory Model - Stores recent password hashes for users to prevent reuse.
"""
from database import db
from datetime import datetime

class PasswordHistory(db.Model):
    __tablename__ = 'password_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False) # Store the same hash format as User.password_hash
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship('User', backref=db.backref('password_history_entries', lazy='dynamic', cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<PasswordHistory UserID: {self.user_id} CreatedAt: {self.created_at.strftime("%Y-%m-%d %H:%M:%S")}>'
