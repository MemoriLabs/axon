from __future__ import annotations

from axon.providers.openai.detect import is_openai_client
from axon.providers.openai.proxy import patch_openai_client
from axon.registry import register_client

_registered = False


def register() -> None:
    global _registered
    if _registered:
        return
    register_client(matcher=is_openai_client, patcher=patch_openai_client)
    _registered = True


register()

__all__ = ["register"]
