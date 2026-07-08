"""Environment configuration for the TETGenie AI backend.

On Railway you set these as service variables. Locally, values are read from a
`.env` file — parsed LITERALLY (never via `source`), because the SAP client
secret contains a `$` that bash would corrupt.
"""
from __future__ import annotations

import os
from functools import lru_cache


def _load_dotenv() -> None:
    """Load .env into os.environ without shell interpolation. No-op if absent."""
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        # Do not override real environment variables (Railway wins over .env).
        os.environ.setdefault(key.strip(), val.strip())


_load_dotenv()


class Settings:
    # ── SAP AI Core (orchestration deployment) ──
    AICORE_TOKEN_URL = os.environ.get("AICORE_TOKEN_URL", "")
    AICORE_CLIENT_ID = os.environ.get("AICORE_CLIENT_ID", "")
    AICORE_CLIENT_SECRET = os.environ.get("AICORE_CLIENT_SECRET", "")
    AICORE_BASE_URL = os.environ.get("AICORE_BASE_URL", "")
    AICORE_RESOURCE_GROUP = os.environ.get("AICORE_RESOURCE_GROUP", "default")
    AICORE_DEPLOYMENT_ID = os.environ.get("AICORE_DEPLOYMENT_ID", "")
    AICORE_DEPLOYMENT_URL = os.environ.get("AICORE_DEPLOYMENT_URL", "")
    AICORE_MODEL_NAME = os.environ.get("AICORE_MODEL_NAME", "anthropic--claude-4.6-opus")

    # ── Firebase (for verifying caller ID tokens; no service account needed) ──
    FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")
    # Comma-separated admin emails allowed to run AI jobs. If empty, any verified
    # user of the Firebase project may call (tighten this in production!).
    ADMIN_EMAILS = [
        e.strip().lower()
        for e in os.environ.get("ADMIN_EMAILS", "").split(",")
        if e.strip()
    ]
    # Set to "1" to skip token verification for local development ONLY.
    DISABLE_AUTH = os.environ.get("DISABLE_AUTH", "") == "1"

    # ── Extraction tuning ──
    RENDER_DPI = int(os.environ.get("RENDER_DPI", "170"))
    VISION_CONCURRENCY = int(os.environ.get("VISION_CONCURRENCY", "5"))
    MAX_PDF_MB = int(os.environ.get("MAX_PDF_MB", "40"))

    # CORS: comma-separated allowed origins (your frontend URL). "*" for dev.
    CORS_ORIGINS = [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
    ]

    @property
    def deployment_url(self) -> str:
        if self.AICORE_DEPLOYMENT_URL:
            return self.AICORE_DEPLOYMENT_URL
        base = self.AICORE_BASE_URL.rstrip("/")
        if base and not base.endswith("/v2"):
            base += "/v2"
        return f"{base}/inference/deployments/{self.AICORE_DEPLOYMENT_ID}"

    @property
    def auth_url(self) -> str:
        # Accept either the full /oauth/token URL or the bare UAA base.
        return self.AICORE_TOKEN_URL if self.AICORE_TOKEN_URL.endswith("/oauth/token") \
            else self.AICORE_TOKEN_URL.rstrip("/") + "/oauth/token"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
