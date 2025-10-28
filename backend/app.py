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


    db.init_app(app)
    with app.app_context():
        init_db()


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
