"""Verify Firebase ID tokens WITHOUT the Admin SDK / a service account.

Firebase ID tokens are RS256 JWTs signed by Google. We validate the signature
against Google's public x509 certs and check issuer/audience/expiry. Optionally
we restrict callers to an ADMIN_EMAILS allowlist (the email is a verified claim
in the token), giving admin-only access with zero extra Firebase setup.
"""
from __future__ import annotations

import time
import threading
import requests
import jwt
from cryptography.x509 import load_pem_x509_certificate
from fastapi import Header, HTTPException

from .config import settings

_CERT_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

_certs: dict[str, object] = {}
_certs_exp = 0.0
_lock = threading.Lock()


def _get_public_key(kid: str):
    global _certs, _certs_exp
    with _lock:
        if not _certs or time.time() > _certs_exp:
            resp = requests.get(_CERT_URL, timeout=15)
            resp.raise_for_status()
            # Map: key id -> PEM x509 cert string.
            _certs = dict(resp.json())
            # Cache per Cache-Control max-age (default ~1h).
            cc = resp.headers.get("Cache-Control", "")
            max_age = 3600
            for part in cc.split(","):
                if "max-age" in part:
                    try:
                        max_age = int(part.split("=")[1])
                    except (ValueError, IndexError):
                        pass
            _certs_exp = time.time() + max_age
        cert_pem = _certs.get(kid)
        if not cert_pem:
            return None
        return load_pem_x509_certificate(cert_pem.encode()).public_key()


def verify_id_token(id_token: str) -> dict:
    project = settings.FIREBASE_PROJECT_ID
    if not project:
        raise HTTPException(500, "FIREBASE_PROJECT_ID is not configured on the backend.")
    try:
        header = jwt.get_unverified_header(id_token)
    except Exception:
        raise HTTPException(401, "Malformed authentication token.")
    key = _get_public_key(header.get("kid", ""))
    if key is None:
        raise HTTPException(401, "Unknown token signing key.")
    try:
        claims = jwt.decode(
            id_token,
            key=key,
            algorithms=["RS256"],
            audience=project,
            issuer=f"https://securetoken.google.com/{project}",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired. Please log in again.")
    except Exception:
        raise HTTPException(401, "Invalid authentication token.")
    return claims


async def require_admin(authorization: str = Header(default="")) -> dict:
    """FastAPI dependency: verify the bearer token and enforce the admin allowlist."""
    if settings.DISABLE_AUTH:
        return {"email": "dev@local", "uid": "dev"}
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token.")
    claims = verify_id_token(authorization.split(" ", 1)[1].strip())
    email = (claims.get("email") or "").lower()
    if settings.ADMIN_EMAILS and email not in settings.ADMIN_EMAILS:
        raise HTTPException(403, "This action is restricted to TETGenie admins.")
    return claims
