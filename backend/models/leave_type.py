"""
LeaveType Model - Defines different types of leave available
"""
from backend.database import db # Corrected import path
from datetime import datetime

class LeaveType(db.Model):
    __tablename__ = 'leave_types'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # If company_id is null, it's a global leave type. Otherwise, company-specific.
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=True)

    is_paid = db.Column(db.Boolean, default=True, nullable=False)
    requires_approval = db.Column(db.Boolean, default=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('Company', backref=db.backref('leave_types', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'company_id': self.company_id,
            'is_paid': self.is_paid,
            'requires_approval': self.requires_approval,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<LeaveType {self.name} (ID: {self.id})>'
