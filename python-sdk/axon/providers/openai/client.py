from __future__ import annotations

from typing import Any


def create_openai_client(**kwargs: Any) -> Any:
    try:
        from openai import OpenAI
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            'OpenAI SDK not installed. Install with "axon[openai]".'
        ) from exc
    return OpenAI(**kwargs)


def create_async_openai_client(**kwargs: Any) -> Any:
    try:
        from openai import AsyncOpenAI
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            'OpenAI SDK not installed. Install with "axon[openai]".'
        ) from exc
    return AsyncOpenAI(**kwargs)
