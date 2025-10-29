"""Runtime checks to ensure critical schema columns exist.

These helpers allow the application to self-heal older SQLite databases that
miss columns introduced by recent migrations.  The production deployment uses
Alembic but on customer instances the database file is sometimes upgraded via
scripts; if one of those steps is skipped the ORM will crash when it tries to
load a column that is missing.  By applying lightweight ``ALTER TABLE``
instructions during start-up we guarantee that the API keeps working while still
printing a clear message in the logs so administrators can follow-up with a
proper migration later.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from backend.database import db


@contextmanager
def _connection():
    """Yield a database connection with an implicit transaction."""

    engine = db.engine
    with engine.begin() as conn:  # type: ignore[attr-defined]
        yield conn


def _ensure_column(conn, table: str, column: str, ddl: str, post_update_sql: str | None = None) -> None:
    """Add ``column`` to ``table`` if it is missing."""

    inspector = inspect(conn)
    columns = {col["name"] for col in inspector.get_columns(table)}
    if column in columns:
        return

    logger = logging.getLogger(__name__)
    logger.warning("Detected missing column %s.%s – applying fallback migration", table, column)

    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
    if post_update_sql:
        conn.execute(text(post_update_sql))


def ensure_schema_columns() -> None:
    """Ensure critical columns exist for legacy SQLite databases."""

    try:
        with _connection() as conn:
            # Geolocation details introduced after some customer databases were created.
            _ensure_column(conn, "pointages", "accuracy", "accuracy FLOAT")
            _ensure_column(conn, "pointages", "altitude", "altitude FLOAT")
            _ensure_column(conn, "pointages", "heading", "heading FLOAT")
            _ensure_column(conn, "pointages", "speed", "speed FLOAT")

            # Mission invitations workflow fields.
            _ensure_column(
                conn,
                "mission_users",
                "status",
                "status TEXT DEFAULT 'pending'",
                "UPDATE mission_users SET status = 'pending' WHERE status IS NULL",
            )
            _ensure_column(conn, "mission_users", "responded_at", "responded_at DATETIME")
    except SQLAlchemyError as exc:  # pragma: no cover - only triggered on misconfiguration
        logging.getLogger(__name__).error("Automatic schema check failed: %s", exc)


__all__ = ["ensure_schema_columns"]
