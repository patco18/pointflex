import pyotp
from backend.tests.test_reports import login_admin


def test_two_factor_flow(client, monkeypatch):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    # prevent external effects
    monkeypatch.setattr("backend.utils.notification_utils.send_notification", lambda *a, **k: None)
    monkeypatch.setattr("backend.middleware.audit.log_user_action", lambda *a, **k: None)

    # Setup 2FA
    resp = client.post("/api/auth/2fa/setup", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    secret = data["otp_secret"]

    # Enable 2FA
    otp = pyotp.TOTP(secret).now()
    resp = client.post(
        "/api/auth/2fa/verify-and-enable",
        json={"otp_code": otp, "otp_secret": secret},
        headers=headers,
    )
    assert resp.status_code == 200

    # Login should now require 2FA
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@pointflex.com", "password": "admin123"},
    )
    assert resp.status_code == 202
    user_id = resp.get_json()["user_id"]

    # Verify login with OTP
    otp = pyotp.TOTP(secret).now()
    resp = client.post(
        "/api/auth/2fa/verify-login",
        json={"user_id": user_id, "otp_code": otp},
    )
    assert resp.status_code == 200
    token_2fa = resp.get_json()["token"]

    # Disable 2FA using password
    headers = {"Authorization": f"Bearer {token_2fa}"}
    resp = client.post(
        "/api/auth/2fa/disable",
        json={"password": "admin123"},
        headers=headers,
    )
    assert resp.status_code == 200
