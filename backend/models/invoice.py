"""
Model Invoice - Gestion de la facturation des abonnements
"""

from backend.database import db
from datetime import datetime

class Invoice(db.Model):
    """Modèle pour les factures d'abonnement"""

    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    months = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, paid, cancelled
    due_date = db.Column(db.Date, default=datetime.utcnow().date)
    paid_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('Company', backref='invoices', lazy=True)

    payments = db.relationship('Payment', backref='invoice', lazy=True, cascade='all, delete-orphan')

    def mark_paid(self, payment_date=None):
        """Marque la facture comme payée"""
        self.status = 'paid'
        self.paid_date = payment_date or datetime.utcnow().date()

    def to_dict(self):
        """Convertit la facture en dictionnaire"""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'amount': self.amount,
            'months': self.months,
            'description': self.description,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<Invoice {self.id} - Company {self.company_id}>'
