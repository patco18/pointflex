"""
LeaveBalance Model - Tracks available leave for users
"""
from backend.database import db # Corrected import path
from datetime import datetime

class LeaveBalance(db.Model):
    __tablename__ = 'leave_balances'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    leave_type_id = db.Column(db.Integer, db.ForeignKey('leave_types.id'), nullable=False, index=True)

    balance_days = db.Column(db.Float, nullable=False, default=0.0)
    # Example: For annual accruals, this could be the year the balance applies to.
    # Or it could be a specific period_start_date and period_end_date.
    # For simplicity, starting with a general balance.
    # accrual_period_identifier = db.Column(db.String(50), nullable=True) # e.g., "2023", "Q1-2024"

    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (db.UniqueConstraint('user_id', 'leave_type_id', name='uq_user_leave_type_balance'),)

    user = db.relationship('User', backref=db.backref('leave_balances', lazy='dynamic'))
    leave_type = db.relationship('LeaveType', backref=db.backref('balances', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'leave_type_id': self.leave_type_id,
            'leave_type_name': self.leave_type.name if self.leave_type else None,
            'balance_days': self.balance_days,
            'last_updated': self.last_updated.isoformat()
        }

    def __repr__(self):
        return f'<LeaveBalance User {self.user_id} - Type {self.leave_type_id}: {self.balance_days} days>'
