r"""
     /\
    /  \   __  _____  _ __
   / /\ \  \ \/ / _ \| '_ \
  / ____ \  >  < (_) | | | |
 /_/    \_\/_/\_\___/|_| |_|
                       memorilabs.ai
"""

from __future__ import annotations

import asyncio
import inspect
import threading
from collections.abc import Iterable
from typing import Any

from axon._config import Config
from axon.errors import AxonHookError
from axon.hooks import HookRegistry
from axon.types import CallContext, LLMRequest, LLMResponse


def _maybe_await_in_sync(value: Any) -> Any:
    if not inspect.isawaitable(value):
        return value
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(value)
    raise RuntimeError("Got awaitable in sync call; use async client calls.")


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


class LLMRegistry:
    def __init__(self, axon: "Axon") -> None:
        self.axon = axon

    def register(self, client: object) -> "Axon":
        from axon.llm._registry import register_llm_client

        return register_llm_client(axon=self.axon, client=client)


class Axon:
    def __init__(self, tasks: Iterable[object] | None = None) -> None:
        self.config = Config()
        self._tasks = list(tasks) if tasks is not None else []
        self._ctx_lock = threading.Lock()
        self._last_ctx: CallContext | None = None
        self.llm = LLMRegistry(self)
        self.before = HookRegistry(self, phase="before")
        self.after = HookRegistry(self, phase="after")

    def _set_last_ctx(self, ctx: CallContext) -> None:
        with self._ctx_lock:
            self._last_ctx = ctx

    def _iter_hooks(self, attr: str) -> Iterable[tuple[object, Any]]:
        for task in self._tasks:
            hook = getattr(task, attr, None)
            if hook is None:
                continue
            yield task, hook

    def _run_before(self, request: LLMRequest, ctx: CallContext) -> LLMRequest:
        for task, hook in self._iter_hooks("before_call"):
            try:
                updated = _maybe_await_in_sync(hook(request, ctx))
            except Exception as exc:
                raise AxonHookError(hook="before_call", task=task, cause=exc) from exc
            if updated is not None:
                request = updated
        return request

    def _run_after(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> LLMResponse:
        for task, hook in self._iter_hooks("after_call"):
            try:
                updated = _maybe_await_in_sync(hook(request, response, ctx))
            except Exception as exc:
                raise AxonHookError(hook="after_call", task=task, cause=exc) from exc
            if updated is not None:
                response = updated
        return response

    async def _arun_before(self, request: LLMRequest, ctx: CallContext) -> LLMRequest:
        for task, hook in self._iter_hooks("before_call"):
            try:
                updated = await _maybe_await(hook(request, ctx))
            except Exception as exc:
                raise AxonHookError(hook="before_call", task=task, cause=exc) from exc
            if updated is not None:
                request = updated
        return request

    async def _arun_after(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> LLMResponse:
        for task, hook in self._iter_hooks("after_call"):
            try:
                updated = await _maybe_await(hook(request, response, ctx))
            except Exception as exc:
                raise AxonHookError(hook="after_call", task=task, cause=exc) from exc
            if updated is not None:
                response = updated
        return response
