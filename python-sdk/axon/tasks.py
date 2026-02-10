from __future__ import annotations

from typing import Awaitable, Protocol

from axon.types import CallContext, LLMRequest, LLMResponse


class Task(Protocol):
    def before_call(
        self, request: LLMRequest, ctx: CallContext
    ) -> LLMRequest | None | Awaitable[LLMRequest | None]: ...

    def after_call(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> LLMResponse | None | Awaitable[LLMResponse | None]: ...
