import click
from flask.cli import with_appcontext
from datetime import datetime, date

from database import db
from backend.models.user import User
from backend.models.leave_type import LeaveType
from backend.models.leave_balance import LeaveBalance
from backend.models.audit_log import AuditLog # For logging the accrual action

def register_cli_commands(app):
    @app.cli.command('accrue-leave')
    @click.option('--year', type=int, default=None, help="Accrue for a specific year. Defaults to current year if run on Jan 1st, else needs specified.")
    @click.option('--month', type=int, default=None, help="Accrue for a specific month (1-12). If provided with year, used for monthly accrual simulation (not standard annual).")
    @click.option('--day', type=int, default=None, help="Accrue for a specific day. Typically used with year and month for specific date trigger.")
    @click.option('--company_id', type=int, default=None, help="Accrue for a specific company ID.")
    @click.option('--user_id', type=int, default=None, help="Accrue for a specific user ID.")
    @click.option('--leave_type_id', type=int, default=None, help="Accrue for a specific leave type ID.")
    @click.option('--dry-run', is_flag=True, help="Simulate accrual without committing changes.")
    def accrue_leave_command(year, month, day, company_id, user_id, leave_type_id, dry_run):
        """
        Automated Leave Accrual Task.
        Typically run annually (e.g., on Jan 1st for the new year).
        Can be targeted with options for specific scenarios or testing.
        """
        print("Starting leave accrual process...")

        target_date = date.today()
        if year and month and day:
            try:
                target_date = date(year, month, day)
                print(f"Targeting specific date: {target_date.isoformat()}")
            except ValueError:
                print(f"Error: Invalid date provided ({year}-{month}-{day}).")
                return
        elif year:
             # If only year is given, assume it's for Jan 1st of that year for annual accrual logic
            target_date = date(year, 1, 1) # Default to Jan 1st if only year is specified
            print(f"Targeting year {year} (assuming Jan 1st for annual accrual).")

        # Determine the accrual year (e.g., if run on Jan 1st 2024, it's for the year 2024)
        accrual_year = target_date.year

        # --- Querying Users ---
        user_query = User.query.filter_by(is_active=True)
        if company_id:
            user_query = user_query.filter_by(company_id=company_id)
        if user_id:
            user_query = user_query.filter_by(id=user_id)

        users_to_process = user_query.all()
        if not users_to_process:
            print("No active users found matching criteria.")
            return

        # --- Querying Leave Types ---
        lt_query = LeaveType.query.filter(LeaveType.is_active==True, LeaveType.annual_accrual_days != None, LeaveType.annual_accrual_days > 0)
        if leave_type_id:
            lt_query = lt_query.filter_by(id=leave_type_id)
        if company_id: # If company_id is specified, consider types for that company OR global types
            lt_query = lt_query.filter( (LeaveType.company_id == company_id) | (LeaveType.company_id == None) )

        leave_types_to_accrue = lt_query.all()
        if not leave_types_to_accrue:
            print("No active leave types found with positive annual_accrual_days.")
            return

        accrual_count = 0
        for user in users_to_process:
            for lt in leave_types_to_accrue:
                # Company specific leave type check again for user's company
                if lt.company_id is not None and lt.company_id != user.company_id:
                    if company_id and lt.company_id == company_id : # If we are processing a specific company, this type is ok
                        pass
                    else:
                        continue # Skip this leave type if it's for a different company and not global

                # Idempotency Check: Has this user already accrued this leave type for this year?
                # This requires a log or a way to mark accruals. For simplicity, we can use AuditLog
                # or assume that if a balance exists and was updated this year for accrual, skip.
                # A more robust way is a dedicated LeaveAccrualLog table.
                # Simple check: if balance already reflects a significant positive amount, assume it might have been accrued.
                # This is not perfectly idempotent without a dedicated log.

                # For now, we'll make it idempotent by checking if an audit log for this specific accrual exists for this year.
                # This means we need to log the accrual year.
                existing_accrual_log = AuditLog.query.filter(
                    AuditLog.user_id == user.id,
                    AuditLog.action == 'ANNUAL_LEAVE_ACCRUAL',
                    AuditLog.resource_type == 'LeaveBalance',
                    AuditLog.details.contains(f'"leave_type_id": {lt.id}'), # Crude JSON search
                    AuditLog.details.contains(f'"accrual_year": {accrual_year}')
                ).first()

                if existing_accrual_log and not dry_run: # If already logged for this year for this type/user
                    print(f"Skipping accrual for User {user.id} ({user.email}), Type '{lt.name}'. Already accrued for {accrual_year}.")
                    continue

                balance_entry = LeaveBalance.query.filter_by(user_id=user.id, leave_type_id=lt.id).first()
                if not balance_entry:
                    balance_entry = LeaveBalance(user_id=user.id, leave_type_id=lt.id, balance_days=0)
                    if not dry_run:
                        db.session.add(balance_entry)

                accrual_amount = lt.annual_accrual_days
                old_balance = balance_entry.balance_days
                new_balance = old_balance + accrual_amount

                print(f"{'DRY RUN: ' if dry_run else ''}User {user.id} ({user.email}), Type '{lt.name}': "
                      f"Old Balance={old_balance}, Accruing={accrual_amount}, New Balance={new_balance}")

                if not dry_run:
                    balance_entry.balance_days = new_balance
                    balance_entry.last_updated = datetime.utcnow()

                    # Log this specific accrual action
                    AuditLog.log_action(
                        user_email="system@pointflex.com", # System action
                        user_id=None, # Or a dedicated system user ID
                        action='ANNUAL_LEAVE_ACCRUAL',
                        resource_type='LeaveBalance',
                        resource_id=balance_entry.id, # After potential add and flush if new
                        details={
                            'target_user_id': user.id,
                            'target_user_email': user.email,
                            'leave_type_id': lt.id,
                            'leave_type_name': lt.name,
                            'accrued_days': accrual_amount,
                            'accrual_year': accrual_year,
                            'reason': f'Annual accrual for {accrual_year}'
                        },
                        old_values={'balance_days': old_balance},
                        new_values={'balance_days': new_balance}
                    )
                accrual_count += 1

        if not dry_run:
            try:
                db.session.commit()
                print(f"Successfully committed {accrual_count} leave balance updates.")
            except Exception as e:
                db.session.rollback()
                print(f"Error during commit: {e}")
        else:
            print(f"Dry run complete. Would have processed {accrual_count} accruals.")

        print("Leave accrual process finished.")

    # If you have more CLI commands, you can group them:
    # leave_cli = AppGroup('leave', help='Leave management commands.')
    # leave_cli.add_command(accrue_leave_command)
    # app.cli.add_command(leave_cli)
