"""
LeaveRequest Model - Represents an employee's request for leave
"""
from database import db # Corrected import path
from datetime import datetime, date, timedelta # Added timedelta
import holidays # For calculating workdays, may need to add to requirements.txt
from backend.models.user import User # Added User import

from backend.models.company import Company # To fetch company policy
from backend.models.company_holiday import CompanyHoliday # To fetch company specific holidays

# Updated function to calculate working days considering company policies
def calculate_workdays(start_date: date, end_date: date, company_id: int) -> float:
    if start_date > end_date:
        return 0.0

    company = Company.query.get(company_id)
    if not company:
        # Fallback or raise error if company not found
        # For fallback, we might use a default Mon-Fri and no specific holidays
        # This case should ideally not happen if company_id is always valid
        # Defaulting to Mon-Fri, no company holidays, FR national holidays for safety
        work_days_indices = {0, 1, 2, 3, 4}
        country_code = 'FR'
        company_specific_holidays = []
    else:
        # Work days: "0,1,2,3,4" -> {0, 1, 2, 3, 4}
        try:
            work_days_indices = set(map(int, company.work_days.split(','))) if company.work_days else {0,1,2,3,4}
        except ValueError: # Handle potential malformed string
            work_days_indices = {0,1,2,3,4} # Default to Mon-Fri on error

        country_code = company.default_country_code_for_holidays or 'FR'

        # Fetch company-specific holidays within the broad range of the leave request
        # This range can be optimized if performance becomes an issue for very long leave requests.
        min_year = start_date.year -1 # Buffer for holidays defined near year boundaries
        max_year = end_date.year +1
        company_specific_holidays_query = CompanyHoliday.query.filter(
            CompanyHoliday.company_id == company_id,
            CompanyHoliday.date >= date(min_year, 1, 1),
            CompanyHoliday.date <= date(max_year, 12, 31)
        ).all()
        company_specific_holidays = {ch.date for ch in company_specific_holidays_query}

    num_total_days = (end_date - start_date).days + 1
    workdays_count = 0.0
    current_processing_date = start_date

    # Fetch national holidays once
    # The holidays library is efficient, but for very wide date ranges, consider year-by-year fetching if needed.
    # Ensure years are correctly handled for multi-year leave requests.
    national_holidays_years = list(range(start_date.year, end_date.year + 1))
    try:
        national_holidays = getattr(holidays, country_code.upper())(years=national_holidays_years)
    except (AttributeError, TypeError): # Handle invalid country_code or issues with holidays lib
        national_holidays = {} # No national holidays if code is bad or lib fails

    for _ in range(num_total_days):
        # weekday(): Monday is 0 and Sunday is 6
        if current_processing_date.weekday() in work_days_indices and \
           current_processing_date not in national_holidays and \
           current_processing_date not in company_specific_holidays:
            workdays_count += 1.0
        current_processing_date += timedelta(days=1)

    return workdays_count


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
        if self.start_date and self.end_date and self.user_id:
            # Fetch the user to get their company_id for accurate workday calculation
            # This adds a DB query during __init__, which is generally okay for new objects.
            # If user object is already available (e.g. passed to constructor), that's better.
            user_for_calc = db.session.get(User, self.user_id) # Use db.session.get for SQLAlchemy 2.0+ style if User is imported
            if not user_for_calc : # Fallback if user somehow not found yet
                # This should not happen if user_id is a valid FK.
                # We might need to handle this or ensure user_id is always set before __init__ logic.
                # For now, if no user, can't get company_id, so might default or raise.
                # Defaulting to 0 days or raising an error might be safer.
                # Let's assume user_id is valid and user will be found.
                pass # Should not happen with proper FKs

            if user_for_calc and user_for_calc.company_id:
                self.requested_days = calculate_workdays(self.start_date, self.end_date, user_for_calc.company_id)
            else:
                # If user has no company, or for some reason company_id is not set,
                # workday calculation might default or be inaccurate.
                # Consider a global default or raise an error.
                # For now, if no company_id, it might use a default policy in calculate_workdays.
                # This path should be rare for leave requests tied to employment.
                # Let's ensure calculate_workdays handles a None company_id gracefully or we prevent this.
                # The current calculate_workdays expects a company_id.
                # So, if user_for_calc.company_id is None, this will fail.
                # We must ensure company_id is available.
                # A user requesting leave should always have a company.
                if not user_for_calc: # Should not occur with Flask-SQLAlchemy session context
                     raise ValueError("User not found for calculating workdays in LeaveRequest init.")
                if not user_for_calc.company_id:
                    raise ValueError(f"User {user_for_calc.id} requesting leave must belong to a company for workday calculation.")
                # This line will now only be reached if company_id is present.
                self.requested_days = calculate_workdays(self.start_date, self.end_date, user_for_calc.company_id)


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
