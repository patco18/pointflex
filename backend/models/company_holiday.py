"""
CompanyHoliday Model - Stores company-specific holidays
"""
from database import db # Assuming database.py is in the root of 'backend'
from datetime import datetime

class CompanyHoliday(db.Model):
    __tablename__ = 'company_holidays'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, index=True)

    date = db.Column(db.Date, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    # description = db.Column(db.Text, nullable=True) # Optional

    # For recurring holidays (e.g., every Jan 1st).
    # If True, 'date' field's year might be ignored or used as a reference.
    # For simplicity in MVP, we might initially only support specific, non-recurring dates.
    # is_recurring = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('Company', backref=db.backref('company_holidays', lazy='dynamic', cascade='all, delete-orphan'))

    __table_args__ = (db.UniqueConstraint('company_id', 'date', 'name', name='uq_company_holiday_date_name'),)


    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'date': self.date.isoformat(),
            'name': self.name,
            # 'description': self.description,
            # 'is_recurring': self.is_recurring,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<CompanyHoliday {self.name} on {self.date.isoformat()} for Company {self.company_id}>'
