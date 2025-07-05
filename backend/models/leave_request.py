"""
LeaveRequest Model - Represents an employee's request for leave
"""
from database import db # Corrected import path
from datetime import datetime, date, timedelta # Added timedelta
import holidays # For calculating workdays, may need to add to requirements.txt
from backend.models.user import User # Added User import

from backend.models.company import Company # To fetch company policy
from backend.models.company_holiday import CompanyHoliday # To fetch company specific holidays

# Updated function to calculate working days considering company policies and partial days
def calculate_workdays(
    start_date: date,
    end_date: date,
    company_id: int,
    start_day_period: str = "full_day",
    end_day_period: str = "full_day"
) -> float:
    if start_date > end_date:
        return 0.0

    # Validate periods
    valid_periods = ["full_day", "half_day_morning", "half_day_afternoon"]
    if start_day_period not in valid_periods or end_day_period not in valid_periods:
        raise ValueError("Invalid start_day_period or end_day_period value.")

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

            current_day_value = 1.0 # Assume a full workday

            is_single_day_leave = (start_date == end_date)

            if is_single_day_leave:
                if start_day_period != "full_day" or end_day_period != "full_day":
                    # If either start or end period specifies a half day for a single day leave, it's 0.5 days.
                    # UI should ideally ensure start_day_period and end_day_period are consistent for single day
                    # (e.g., both "half_day_morning" or one is "full_day" and other is "half_day_morning")
                    # or guide that "half_day_morning" start and "half_day_afternoon" end on same day is 1 full day.
                    # For simplicity here: any mention of half-day makes it 0.5 for a single day.
                    # If start=morning, end=afternoon on same day, UI should make it a full_day request.
                    current_day_value = 0.5
            else: # Multi-day leave
                if current_processing_date == start_date and start_day_period != "full_day":
                    current_day_value = 0.5
                elif current_processing_date == end_date and end_day_period != "full_day":
                    current_day_value = 0.5
                # Else, it's a full day (1.0) if it's a middle day of the leave period

            workdays_count += current_day_value
        current_processing_date += timedelta(days=1)

    return workdays_count


class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True) # Employee making request
    leave_type_id = db.Column(db.Integer, db.ForeignKey('leave_types.id'), nullable=False, index=True)

    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    # For partial days
    start_day_period = db.Column(db.String(20), default='full_day', nullable=False) # "full_day", "half_day_morning", "half_day_afternoon"
    end_day_period = db.Column(db.String(20), default='full_day', nullable=False)   # "full_day", "half_day_morning", "half_day_afternoon"

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
        # Pop custom args before passing to super
        start_day_period_arg = kwargs.pop('start_day_period', 'full_day')
        end_day_period_arg = kwargs.pop('end_day_period', 'full_day')

        super(LeaveRequest, self).__init__(**kwargs)

        # Ensure these are set from kwargs or defaults if not already on self (e.g. if object is loaded from DB)
        if not hasattr(self, 'start_day_period') or self.start_day_period is None:
            self.start_day_period = start_day_period_arg
        if not hasattr(self, 'end_day_period') or self.end_day_period is None:
            self.end_day_period = end_day_period_arg

        if self.start_date and self.end_date and self.user_id:
            user_for_calc = db.session.get(User, self.user_id)
            if not user_for_calc:
                 raise ValueError(f"User with ID {self.user_id} not found for LeaveRequest initialization.")
            if not user_for_calc.company_id:
                raise ValueError(f"User {self.user_id} must belong to a company to request leave.")

            self.requested_days = calculate_workdays(
                self.start_date,
                self.end_date,
                user_for_calc.company_id,
                self.start_day_period, # Use the instance's period
                self.end_day_period   # Use the instance's period
            )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.prenom} {self.user.nom}" if self.user else None,
            'leave_type_id': self.leave_type_id,
            'leave_type_name': self.leave_type.name if self.leave_type else None,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'start_day_period': self.start_day_period,
            'end_day_period': self.end_day_period,
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
