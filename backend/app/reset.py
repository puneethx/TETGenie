"""Forgot-password reset via the Firebase Admin SDK.

This is the ONLY part of the backend that needs a Firebase service account —
Firebase does not allow changing another user's password from the client or from
a bare token. It stays optional: if firebase-admin isn't installed or no service
account is configured, the endpoint returns a clear 503 and the rest of the app
is unaffected.

Flow: the admin shares the code (PASSWORD_RESET_CODE, default "TETFRGTPASS") with
a user on WhatsApp; the user submits email + code + new password here.
"""
from __future__ import annotations

import json
import threading

from .config import settings

_app = None
_lock = threading.Lock()


def _get_admin_app():
    """Lazily initialise a named Firebase Admin app from the service account."""
    global _app
    with _lock:
        if _app is not None:
            return _app
        try:
            import firebase_admin
            from firebase_admin import credentials
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(
                "Password reset needs the 'firebase-admin' package on the server."
            ) from e

        raw = settings.FIREBASE_SERVICE_ACCOUNT_JSON.strip()
        if not raw:
            raise RuntimeError(
                "Password reset is not configured (set FIREBASE_SERVICE_ACCOUNT_JSON)."
            )
        try:
            info = json.loads(raw)
        except Exception as e:  # noqa: BLE001
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.") from e

        cred = credentials.Certificate(info)
        try:
            _app = firebase_admin.get_app("reset")
        except ValueError:
            _app = firebase_admin.initialize_app(cred, name="reset")
        return _app


def reset_password(email: str, code: str, new_password: str) -> None:
    """Raise ValueError for bad input, RuntimeError if not configured."""
    if (code or "") != settings.PASSWORD_RESET_CODE:
        raise ValueError("Invalid reset code. Please check with the admin on WhatsApp.")
    pw = new_password or ""
    if len(pw) < 8 or not any(c.isupper() for c in pw):
        raise ValueError("Password must be at least 8 characters and include an uppercase letter.")

    app = _get_admin_app()
    from firebase_admin import auth as admin_auth

    user = admin_auth.get_user_by_email((email or "").strip().lower(), app=app)
    admin_auth.update_user(user.uid, password=pw, app=app)
