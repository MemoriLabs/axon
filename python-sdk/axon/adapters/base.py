from __future__ import annotations

from typing import Protocol

from axon.types import CallContext, LLMRequest, LLMResponse


class LLMAdapter(Protocol):
    def call(self, request: LLMRequest, ctx: CallContext) -> LLMResponse: ...
