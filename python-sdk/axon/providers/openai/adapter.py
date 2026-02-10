from __future__ import annotations

from typing import Any

from axon.providers.openai._common import (
    content_from_openai,
    messages_to_openai_input,
    usage_from_openai,
)
from axon.types import LLMRequest, LLMResponse


def _call_kwargs(request: LLMRequest, default_model: str | None) -> dict[str, Any]:
    model = request.model or default_model
    if not model:
        raise ValueError("No model provided (set request.model or default_model).")

    params = dict(request.params)
    params.pop("model", None)
    params.pop("input", None)

    return {
        "model": model,
        "input": messages_to_openai_input(request),
        **params,
    }


class OpenAIResponsesAdapter:
    def __init__(self, client: Any, *, default_model: str | None = None) -> None:
        self._client = client
        self._default_model = default_model

    def call(self, request: LLMRequest, ctx: Any) -> LLMResponse:
        resp = self._client.responses.create(
            **_call_kwargs(request, self._default_model)
        )
        return LLMResponse(
            content=content_from_openai(resp),
            usage=usage_from_openai(resp),
            raw=resp,
        )


class AsyncOpenAIResponsesAdapter:
    def __init__(self, client: Any, *, default_model: str | None = None) -> None:
        self._client = client
        self._default_model = default_model

    async def acall(self, request: LLMRequest, ctx: Any) -> LLMResponse:
        resp = await self._client.responses.create(
            **_call_kwargs(request, self._default_model)
        )
        return LLMResponse(
            content=content_from_openai(resp),
            usage=usage_from_openai(resp),
            raw=resp,
        )


def _chat_kwargs(request: LLMRequest, default_model: str | None) -> dict[str, Any]:
    model = request.model or default_model
    if not model:
        raise ValueError("No model provided (set request.model or default_model).")

    params = dict(request.params)
    params.pop("model", None)
    params.pop("messages", None)

    return {
        "model": model,
        "messages": messages_to_openai_input(request),
        **params,
    }


class OpenAIChatCompletionsAdapter:
    def __init__(self, client: Any, *, default_model: str | None = None) -> None:
        self._client = client
        self._default_model = default_model

    def call(self, request: LLMRequest, ctx: Any) -> LLMResponse:
        resp = self._client.chat.completions.create(
            **_chat_kwargs(request, self._default_model)
        )
        return LLMResponse(
            content=content_from_openai(resp),
            usage=usage_from_openai(resp),
            raw=resp,
        )


class AsyncOpenAIChatCompletionsAdapter:
    def __init__(self, client: Any, *, default_model: str | None = None) -> None:
        self._client = client
        self._default_model = default_model

    async def acall(self, request: LLMRequest, ctx: Any) -> LLMResponse:
        resp = await self._client.chat.completions.create(
            **_chat_kwargs(request, self._default_model)
        )
        return LLMResponse(
            content=content_from_openai(resp),
            usage=usage_from_openai(resp),
            raw=resp,
        )
