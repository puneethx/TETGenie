"""SAP AI Core orchestration client.

Uses the RAW REST `/completion` endpoint (not the Python SDK) because the SDK
models message content as text-only and its response parser cannot handle
multimodal (image) requests. This client supports both text and vision.
"""
from __future__ import annotations

import time
import threading
import requests

from .config import settings


class SapAiCore:
    def __init__(self) -> None:
        self._token = None
        self._token_exp = 0.0
        self._lock = threading.Lock()
        self._session = requests.Session()
        # Disable all environment-based proxy detection (HTTP_PROXY, HTTPS_PROXY,
        # etc.) — Render/Infosys proxies block direct calls to SAP/Hana domains,
        # and `proxies={https: None}` alone isn't enough because requests still
        # merges env vars when trust_env is True.
        self._session.trust_env = False

    # ── OAuth2 client-credentials token, cached until ~1 min before expiry ──
    def _get_token(self) -> str:
        with self._lock:
            if self._token and time.time() < self._token_exp - 60:
                return self._token
            # proxies={} on every call is belt-and-suspenders: even if a
            # network-level or OS-level proxy sneaks through trust_env=False,
            # the per-request empty dict forces urllib3 to go direct.
            resp = self._session.post(
                settings.auth_url,
                data={"grant_type": "client_credentials"},
                auth=(settings.AICORE_CLIENT_ID, settings.AICORE_CLIENT_SECRET),
                timeout=30,
                proxies={},
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            self._token_exp = time.time() + int(data.get("expires_in", 3600))
            return self._token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._get_token()}",
            "Content-Type": "application/json",
            "AI-Resource-Group": settings.AICORE_RESOURCE_GROUP,
        }

    def _completion(self, messages: list, max_tokens: int, temperature: float) -> str:
        body = {
            "orchestration_config": {
                "module_configurations": {
                    "templating_module_config": {"template": messages},
                    "llm_module_config": {
                        "model_name": settings.AICORE_MODEL_NAME,
                        "model_version": "latest",
                        "model_params": {"max_tokens": max_tokens, "temperature": temperature},
                    },
                }
            }
        }
        # Retry on transient errors: auth refresh (401), server errors (5xx),
        # and connection-level failures (proxy errors, dropped connections).
        for attempt in range(3):
            try:
                resp = self._session.post(
                    settings.deployment_url + "/completion",
                    headers=self._headers(),
                    json=body,
                    timeout=180,
                    proxies={},  # force direct — overrides any OS/env proxy
                )
            except requests.exceptions.ProxyError:
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise
            except requests.exceptions.ConnectionError:
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise
            if resp.status_code == 401 and attempt < 2:
                self._token = None
                continue
            if resp.status_code >= 500 and attempt < 2:
                time.sleep(1.5)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data["orchestration_result"]["choices"][0]["message"]["content"]
        return ""

    def chat(self, system: str, user: str, max_tokens: int = 2000, temperature: float = 0.2) -> str:
        """Text-only completion."""
        return self._completion(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens,
            temperature,
        )

    def vision(self, system: str, text: str, image_b64_png: str,
               max_tokens: int = 2200, temperature: float = 0.0) -> str:
        """Completion with one PNG image (base64, no data-URI prefix) + text."""
        return self.vision_multi(system, [(text, image_b64_png)], max_tokens, temperature)

    def vision_multi(self, system: str, pages: list[tuple[str, str]],
                     max_tokens: int = 2200, temperature: float = 0.0) -> str:
        """Completion with multiple PNG pages. pages = [(text_label, image_b64_png), ...]"""
        content: list[dict] = []
        for text, img in pages:
            content.append({"type": "text", "text": text})
            content.append({"type": "image_url",
                            "image_url": {"url": "data:image/png;base64," + img}})
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ]
        return self._completion(messages, max_tokens, temperature)


# Singleton — token cache is shared process-wide.
sap = SapAiCore()
