from __future__ import annotations

from typing import Any

from axon.llm._registry import Registry
from axon.providers.openai.detect import is_openai_client
from axon.providers.openai.proxy import patch_openai_client


@Registry.register_client(is_openai_client)
def _patch_openai(client: Any, *, axon: Any) -> None:
    patch_openai_client(client, axon=axon)
