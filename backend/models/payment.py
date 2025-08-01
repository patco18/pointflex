"""
Model Payment - Enregistrement des paiements
"""

from backend.database import db
from datetime import datetime

class Payment(db.Model):
    """Modèle pour les paiements des factures"""

    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    mobile_money_operator = db.Column(db.String(20), nullable=True)
    transaction_id = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='completed')  # completed, failed
    payment_date = db.Column(db.Date, default=datetime.utcnow().date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('Company', backref='payments', lazy=True)

    def to_dict(self):
        """Convertit le paiement en dictionnaire"""
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'company_id': self.company_id,
            'amount': self.amount,
            'payment_method': self.payment_method,
            'mobile_money_operator': self.mobile_money_operator,
            'transaction_id': self.transaction_id,
            'status': self.status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<Payment {self.id} - Invoice {self.invoice_id}>'
