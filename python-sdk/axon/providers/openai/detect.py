from __future__ import annotations

from typing import Any


def is_openai_client(client: Any) -> bool:
    module = type(client).__module__
    name = type(client).__name__
    if module.startswith("openai") and name in {"OpenAI", "AsyncOpenAI"}:
        return True
    return hasattr(client, "responses") and hasattr(
        getattr(client, "responses"), "create"
    )
