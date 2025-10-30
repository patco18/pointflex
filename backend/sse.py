"""Shared access to the Server-Sent Events extension.

The production stack relies on ``Flask-SSE`` which itself pulls additional
dependencies such as Redis.  Several local development and CI environments run
without those extras, so importing the extension directly would crash the
application before we get a chance to configure an alternative.

This module centralises the import logic: if the real extension is available we
expose it as-is; otherwise we fall back to a very small stub that mimics the
``publish`` API used throughout the code base.  Modules should import
``backend.sse.sse`` instead of ``flask_sse`` directly so that both scenarios are
handled transparently.
"""

from __future__ import annotations

import importlib
import importlib.util

from flask import Blueprint

__all__ = ["sse"]


def _load_real_extension():
    """Return the real ``flask_sse.sse`` object if the package is installed."""

    spec = importlib.util.find_spec("flask_sse")
    if spec is None:
        return None

    module = importlib.import_module("flask_sse")
    return getattr(module, "sse", None)


class _FallbackSSE(Blueprint):
    """No-op drop-in replacement used when Flask-SSE is missing."""

    def __init__(self) -> None:
        super().__init__("sse", __name__)

    def publish(self, *args, **kwargs):  # noqa: D401 - same signature as real extension
        """Ignore publish calls while keeping the call site code unchanged."""


_sse = _load_real_extension()

if _sse is None:
    sse = _FallbackSSE()
else:
    sse = _sse
