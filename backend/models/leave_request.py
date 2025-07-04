"""
LeaveRequest Model - Represents an employee's request for leave
"""
from backend.database import db # Corrected import path
from datetime import datetime, date
import holidays # For calculating workdays, may need to add to requirements.txt

# Placeholder for a function to calculate working days
# This needs to be more robust, considering company's country for holidays, and work week.
def calculate_workdays(start_date: date, end_date: date, country_code: str = 'FR') -> float:
    if start_date > end_date:
        return 0

    num_days = (end_date - start_date).days + 1
    workdays = 0
    current_date = start_date

    # Consider using a more specific holiday calendar if company has multiple countries
    country_holidays = getattr(holidays, country_code.upper())(years=list(range(start_date.year, end_date.year + 2)))

    for _ in range(num_days):
        # Monday is 0, Sunday is 6 for weekday()
        if current_date.weekday() < 5 and current_date not in country_holidays: # Monday to Friday and not a holiday
            workdays += 1
        current_date += timedelta(days=1)
    return float(workdays)


class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True) # Employee making request
    leave_type_id = db.Column(db.Integer, db.ForeignKey('leave_types.id'), nullable=False, index=True)

    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    # For partial days, e.g., 'half_day_morning', 'half_day_afternoon', 'full_day'
    # This adds complexity, for now assume full days.
    # start_day_period = db.Column(db.String(20), default='full_day')
    # end_day_period = db.Column(db.String(20), default='full_day')

    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending', nullable=False, index=True) # pending, approved, rejected, cancelled

    # Calculated number of workdays this request represents.
    # This should be calculated upon creation/update.
    requested_days = db.Column(db.Float, nullable=False, default=0.0)

    approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Manager/Admin
    approver_comments = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('leave_requests', lazy='dynamic'))
    leave_type = db.relationship('LeaveType', backref=db.backref('requests', lazy='dynamic'))
    approved_by = db.relationship('User', foreign_keys=[approved_by_id])


    def __init__(self, **kwargs):
        super(LeaveRequest, self).__init__(**kwargs)
        if self.start_date and self.end_date:
            # Assuming user.company.country exists and is valid for `holidays` library.
            # Defaulting to 'FR' for now. This should be dynamic.
            country_code = 'FR'
            if self.user and self.user.company and self.user.company.country:
                country_code = self.user.company.country
            self.requested_days = calculate_workdays(self.start_date, self.end_date, country_code)


    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.prenom} {self.user.nom}" if self.user else None,
            'leave_type_id': self.leave_type_id,
            'leave_type_name': self.leave_type.name if self.leave_type else None,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'reason': self.reason,
            'status': self.status,
            'requested_days': self.requested_days,
            'approved_by_id': self.approved_by_id,
            'approved_by_name': f"{self.approved_by.prenom} {self.approved_by.nom}" if self.approved_by else None,
            'approver_comments': self.approver_comments,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<LeaveRequest User {self.user_id} ({self.start_date} to {self.end_date}) - Status: {self.status}>'

# Need to import timedelta for calculate_workdays
from datetime import timedelta
