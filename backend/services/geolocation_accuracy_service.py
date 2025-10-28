"""Service for dynamically adapting geolocation accuracy thresholds."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from backend.database import db
from backend.models.geolocation_accuracy_stats import GeolocationAccuracyStats



@dataclass
class GeolocationContext:
    """Small wrapper describing where the adjustment applies."""

    context_type: str
    context_id: Optional[int]
    entity: Optional[object]

    @property
    def has_entity(self) -> bool:
        return self.entity is not None and hasattr(self.entity, 'geolocation_max_accuracy')

    def get_threshold(self, default_threshold: int) -> int:
        if self.has_entity:
            value = getattr(self.entity, 'geolocation_max_accuracy', None)
            if value is not None:
                return int(value)
        return int(default_threshold)

    def set_threshold(self, value: float) -> None:
        if self.has_entity:
            setattr(self.entity, 'geolocation_max_accuracy', int(round(value)))


class GeolocationAccuracyService:
    """Handles adaptive tuning of geolocation accuracy thresholds."""

    MIN_THRESHOLD = 5
    MAX_THRESHOLD = 300
    SUCCESS_STREAK_FOR_IMPROVEMENT = 3
    FAILURE_STREAK_FOR_RELAXATION = 2

    IMPROVEMENT_STEP = 5
    RELAXATION_STEP = 15
    RELAXATION_DURATION = timedelta(hours=6)

    def __init__(self, context: GeolocationContext, user_id: Optional[int] = None):
        self.context = context
        self.user_id = user_id

    @classmethod
    def for_mission(cls, mission, user_id: Optional[int] = None) -> 'GeolocationAccuracyService':
        return cls(GeolocationContext('mission', getattr(mission, 'id', None), mission), user_id)

    @classmethod
    def for_office(cls, office, user_id: Optional[int] = None) -> 'GeolocationAccuracyService':
        return cls(GeolocationContext('office', getattr(office, 'id', None), office), user_id)

    @classmethod
    def for_company(cls, company, user_id: Optional[int] = None) -> 'GeolocationAccuracyService':
        return cls(GeolocationContext('company', getattr(company, 'id', None), company), user_id)

    def record_success(self, accuracy: float, applied_threshold: int) -> None:
        stats = self._get_stats(applied_threshold)
        self._restore_if_expired(stats, applied_threshold)

        stats.register_sample(accuracy)
        stats.success_streak = (stats.success_streak or 0) + 1
        stats.failure_streak = 0

        if stats.temporary_accuracy is not None and accuracy <= (stats.baseline_accuracy or applied_threshold):
            self._restore_baseline(stats)

        if stats.success_streak >= self.SUCCESS_STREAK_FOR_IMPROVEMENT:
            current_threshold = self.context.get_threshold(applied_threshold)
            target_threshold = max(
                self.MIN_THRESHOLD,
                current_threshold - self.IMPROVEMENT_STEP,
            )
            # Only tighten if the average demonstrates meaningful headroom
            if target_threshold < current_threshold and stats.average_accuracy <= current_threshold * 0.6:
                self.context.set_threshold(target_threshold)
                stats.baseline_accuracy = float(target_threshold)
                stats.reset_success()

        db.session.add(stats)

    def record_failure(self, accuracy: float, applied_threshold: int) -> None:
        stats = self._get_stats(applied_threshold)
        self._restore_if_expired(stats, applied_threshold)

        stats.register_sample(accuracy)
        stats.failure_streak = (stats.failure_streak or 0) + 1
        stats.success_streak = 0



        if stats.failure_streak >= self.FAILURE_STREAK_FOR_RELAXATION:
            current_threshold = self.context.get_threshold(applied_threshold)
            new_threshold = min(current_threshold + self.RELAXATION_STEP, self.MAX_THRESHOLD)
            if new_threshold > current_threshold:
                if stats.baseline_accuracy is None:
                    stats.baseline_accuracy = float(current_threshold)
                self.context.set_threshold(new_threshold)
                stats.temporary_accuracy = float(new_threshold)
                stats.temporary_expiration = datetime.utcnow() + self.RELAXATION_DURATION
                stats.reset_failure()

        db.session.add(stats)

    # internal helpers
    def _get_stats(self, applied_threshold: int) -> GeolocationAccuracyStats:
        stats = GeolocationAccuracyStats.query.filter_by(
            context_type=self.context.context_type,
            context_id=self.context.context_id,
            user_id=self.user_id,
        ).first()
        if not stats:
            stats = GeolocationAccuracyStats(
                context_type=self.context.context_type,
                context_id=self.context.context_id,
                user_id=self.user_id,
                success_streak=0,
                failure_streak=0,
                total_samples=0,
                average_accuracy=0.0,
                baseline_accuracy=float(self.context.get_threshold(applied_threshold)),
            )
            db.session.add(stats)
        return stats

    def _restore_if_expired(self, stats: GeolocationAccuracyStats, applied_threshold: int) -> None:
        if stats.temporary_expiration and stats.temporary_expiration <= datetime.utcnow():
            self._restore_baseline(stats)
        elif stats.temporary_accuracy is not None:
            # Align context threshold with recorded temporary value when still active
            if self.context.has_entity:
                current = self.context.get_threshold(applied_threshold)
                if current != int(round(stats.temporary_accuracy)):
                    self.context.set_threshold(stats.temporary_accuracy)

    def _restore_baseline(self, stats: GeolocationAccuracyStats) -> None:
        baseline = stats.baseline_accuracy
        if baseline is not None:
            bounded = max(self.MIN_THRESHOLD, min(self.MAX_THRESHOLD, baseline))
            self.context.set_threshold(bounded)
            stats.temporary_accuracy = None
            stats.temporary_expiration = None
            stats.reset_failure()
            stats.baseline_accuracy = float(bounded)

