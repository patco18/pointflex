"""Application factory for the PointFlex backend.

The legacy script mixed environment probing, blueprint registration and
one-off setup code in a single block which made it harder to reason about the
initialisation order and introduced a couple of regressions (indentation bug,
missing fallback assignments, etc.).

This module now exposes small helper functions that encapsulate each step of
the startup process: configuration loading, runtime warnings, extension
registration and blueprint wiring.  The create_app function simply orchestrates
those helpers which keeps the logic easy to read and, more importantly, easy to
modify without breaking unrelated behaviour.
"""

from __future__ import annotations

import os
import sys
from typing import Iterable, Tuple

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sse import sse

# Ensure the repository root is importable when running ``python app.py`` from
# the backend directory.  This mirrors the behaviour of ``flask --app`` and
# keeps legacy scripts working.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import Config, config as config_map  # noqa: E402
from backend.database import db, init_db  # noqa: E402
from backend.migrations.runtime_schema_checks import ensure_schema_columns  # noqa: E402
from backend.extensions import limiter  # noqa: E402
from backend.middleware.auth import init_auth_middleware  # noqa: E402
from backend.middleware.audit import init_audit_middleware  # noqa: E402
from backend.middleware.error_handler import init_error_handlers  # noqa: E402

# Blueprints -----------------------------------------------------------------
from backend.routes.admin_attendance_routes import admin_attendance_bp  # noqa: E402
from backend.routes.admin_routes import admin_bp  # noqa: E402
from backend.routes.admin_settings_routes import admin_settings_bp  # noqa: E402
from backend.routes.attendance_extras import attendance_extras_bp  # noqa: E402
from backend.routes.attendance_routes import attendance_bp  # noqa: E402
from backend.routes.auth_routes import auth_bp  # noqa: E402
from backend.routes.calendar_routes import calendar_bp  # noqa: E402
from backend.routes.export_routes import export_bp  # noqa: E402
from backend.routes.health_routes import health_bp  # noqa: E402
from backend.routes.leave_routes import leave_bp  # noqa: E402
from backend.routes.mission_routes import mission_bp  # noqa: E402
from backend.routes.mobile_money_routes import mobile_money_bp  # noqa: E402
from backend.routes.notification_routes import notification_bp  # noqa: E402
from backend.routes.pause_routes import pause_bp  # noqa: E402
from backend.routes.profile_routes import profile_bp  # noqa: E402
from backend.routes.push_routes import push_bp  # noqa: E402
from backend.routes.qr_attendance_routes import qr_code_bp  # noqa: E402
from backend.routes.stats_routes import stats_bp  # noqa: E402
from backend.routes.stripe_routes import stripe_bp  # noqa: E402
from backend.routes.subscription_plan_routes import (  # noqa: E402
    subscription_plan_bp,
)
from backend.routes.superadmin_fix_routes import superadmin_fix_bp  # noqa: E402
from backend.routes.superadmin_routes import superadmin_bp  # noqa: E402
from backend.routes.two_factor_routes import two_factor_bp  # noqa: E402
from backend.routes.user_notification_routes import user_notifications_bp  # noqa: E402
from backend.routes.webhook_routes import webhook_bp  # noqa: E402


# Configuration ---------------------------------------------------------------
def _select_config_name() -> str:
    """Resolve the configuration key to load.

    The application historically supported several environment variables.  We
    keep that behaviour but centralise the logic to make it testable.
    """

    for env_var in ("FLASK_CONFIG", "POINTFLEX_ENV", "FLASK_ENV"):
        value = os.environ.get(env_var)
        if value:
            return value
    return "default"


def _load_configuration(app: Flask) -> None:
    """Apply the configuration object selected from the config map."""

    config_name = _select_config_name()
    config_class = config_map.get(config_name, Config)
    app.config.from_object(config_class)

    # Ensure ``app.config['ENV']`` mirrors the configuration so extensions that
    # still rely on it behave consistently.
    if hasattr(config_class, "ENV"):
        app.config["ENV"] = getattr(config_class, "ENV")


# Runtime warnings ------------------------------------------------------------
def _ensure_two_factor_key(app: Flask) -> None:
    """Guarantee that a 2FA encryption key is available or raise early."""

    two_factor_key = app.config.get("TWO_FACTOR_ENCRYPTION_KEY")
    if two_factor_key:
        return

    fallback_key = app.config.get("TWO_FACTOR_DEV_FALLBACK_KEY")
    require_key = app.config.get("TWO_FACTOR_REQUIRE_KEY")

    if require_key or not fallback_key:
        raise RuntimeError(
            "TWO_FACTOR_ENCRYPTION_KEY is not configured. Set it before starting the app."
        )

    app.logger.warning(
        "TWO_FACTOR_ENCRYPTION_KEY is not configured. Using development fallback key; "
        "never use this value in production."
    )
    app.config["TWO_FACTOR_ENCRYPTION_KEY"] = fallback_key
    os.environ.setdefault("TWO_FACTOR_ENCRYPTION_KEY", fallback_key)


def _log_runtime_warnings(app: Flask) -> None:
    if not app.config.get("FCM_SERVER_KEY"):
        app.logger.warning(
            "FCM_SERVER_KEY is not set. Push notifications will be disabled."
        )

    storage_url = app.config.get("RATELIMIT_STORAGE_URL", "")
    if storage_url.startswith("memory"):
        app.logger.warning(
            "RATELIMIT_STORAGE_URL uses local memory. Configure Redis for production use."
        )


# Extensions ------------------------------------------------------------------
def _init_cors(app: Flask) -> None:
    origins = app.config.get("CORS_ORIGINS") or ["http://localhost:5173"]
    if isinstance(origins, str):
        origins = [origin.strip() for origin in origins.split(",") if origin.strip()]
    CORS(app, origins=origins)


def _init_jwt(app: Flask) -> JWTManager:
    return JWTManager(app)


def _init_database(app: Flask) -> None:
    db.init_app(app)
    with app.app_context():
        init_db()
        ensure_schema_columns()


def _init_rate_limiter(app: Flask) -> None:
    if app.config.get("RATELIMIT_ENABLED", True):
        limiter.init_app(app)
        app.limiter = limiter
        return

    class _DummyLimiter:
        def limit(self, *args, **kwargs):
            return lambda func: func

        def exempt(self, *args, **kwargs):
            return lambda func: func

    app.limiter = _DummyLimiter()


def _init_sse(app: Flask) -> None:
    app.config.setdefault("REDIS_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    app.register_blueprint(sse, url_prefix="/stream")


# Blueprint registration ------------------------------------------------------
BlueprintRegistration = Tuple[object, str]


def _blueprint_registrations() -> Iterable[BlueprintRegistration]:
    return (
        (health_bp, "/api"),
        (auth_bp, "/api/auth"),
        (two_factor_bp, "/api/auth/2fa"),
        (admin_bp, "/api/admin"),
        (admin_settings_bp, "/api/admin"),
        (admin_attendance_bp, "/api/admin"),
        (profile_bp, "/api/profile"),
        (attendance_bp, "/api/attendance"),
        (attendance_extras_bp, "/api/attendance"),
        (qr_code_bp, "/api/attendance"),
        (mission_bp, "/api/missions"),
        (notification_bp, "/api/notifications"),
        (user_notifications_bp, "/api/user/notifications"),
        (stripe_bp, "/api/stripe"),
        (push_bp, "/api/push"),
        (calendar_bp, "/api/calendar"),
        (leave_bp, "/api/leave"),
        (mobile_money_bp, "/api/mobile-money"),
        (pause_bp, "/api/pause"),
        (stats_bp, "/api"),
        (export_bp, "/api"),
        (subscription_plan_bp, "/api/subscription"),
        (webhook_bp, "/api/webhooks"),
        (superadmin_bp, "/api/superadmin"),
        (superadmin_fix_bp, "/api/superadmin-fix"),
    )


def _register_blueprints(app: Flask) -> None:
    for blueprint, prefix in _blueprint_registrations():
        app.register_blueprint(blueprint, url_prefix=prefix)


# CLI -------------------------------------------------------------------------
def _register_cli(app: Flask) -> None:
    from backend import cli_commands

    cli_commands.register_cli_commands(app)


# Public API ------------------------------------------------------------------
def create_app() -> Flask:
    app = Flask(__name__)

    _load_configuration(app)
    _ensure_two_factor_key(app)
    _log_runtime_warnings(app)

    _init_cors(app)
    jwt = _init_jwt(app)
    _init_database(app)
    _init_rate_limiter(app)
    _init_sse(app)

    init_auth_middleware(app, jwt)
    init_audit_middleware(app)
    init_error_handlers(app)

    _register_blueprints(app)
    _register_cli(app)

    _register_static_routes(app)

    return app


def _register_static_routes(app: Flask) -> None:
    upload_folder = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", app.config.get("UPLOAD_FOLDER", "uploads"))
    )
    os.makedirs(upload_folder, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_folder

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename: str):  # pragma: no cover - thin wrapper around Flask helper
        return send_from_directory(upload_folder, filename)


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
