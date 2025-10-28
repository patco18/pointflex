"""Model to track dynamic geolocation accuracy adjustments."""

from datetime import datetime

from backend.database import db


class GeolocationAccuracyStats(db.Model):
    """Stores rolling statistics to tune geolocation accuracy thresholds."""

    __tablename__ = 'geolocation_accuracy_stats'

    id = db.Column(db.Integer, primary_key=True)
    context_type = db.Column(db.String(32), nullable=False)
    context_id = db.Column(db.Integer, nullable=True)
    user_id = db.Column(db.Integer, nullable=True)
    success_streak = db.Column(db.Integer, nullable=False, default=0)
    failure_streak = db.Column(db.Integer, nullable=False, default=0)
    total_samples = db.Column(db.Integer, nullable=False, default=0)
    average_accuracy = db.Column(db.Float, nullable=False, default=0.0)
    baseline_accuracy = db.Column(db.Float, nullable=True)
    temporary_accuracy = db.Column(db.Float, nullable=True)
    temporary_expiration = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.UniqueConstraint(
            'context_type', 'context_id', 'user_id', name='uq_geo_accuracy_context_user'
        ),
    )

    def register_sample(self, accuracy):
        """Update rolling average with a new sample."""
        previous_total = self.total_samples or 0
        self.total_samples = previous_total + 1
        current_average = self.average_accuracy or 0.0
        if previous_total == 0:
            self.average_accuracy = accuracy
        else:
            self.average_accuracy = (
                (current_average * previous_total) + accuracy
            ) / self.total_samples

    def reset_success(self):
        self.success_streak = 0

    def reset_failure(self):
        self.failure_streak = 0
