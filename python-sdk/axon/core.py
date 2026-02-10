from __future__ import annotations

import asyncio
import concurrent.futures
import inspect
import threading
import time
from collections.abc import Iterable
from typing import Any

from axon.adapters.base import LLMAdapter
from axon.config import AxonConfig
from axon.errors import AxonAdapterError, AxonHookError
from axon.registry import patch_client
from axon.types import CallContext, LLMRequest, LLMResponse, Message


def _maybe_await_in_sync(value: Any) -> Any:
    if not inspect.isawaitable(value):
        return value
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(value)
    raise RuntimeError("Got awaitable in sync call; use AsyncAxon instead.")


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


def _iter_tasks(tasks: Iterable[object] | None) -> list[object]:
    if tasks is None:
        return []
    return list(tasks)


_after_executor: concurrent.futures.ThreadPoolExecutor | None = None


def _get_after_executor(
    max_workers: int | None,
) -> concurrent.futures.ThreadPoolExecutor:
    global _after_executor
    if _after_executor is None:
        _after_executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
    return _after_executor


def _timings_bucket(ctx: CallContext) -> dict[str, Any]:
    axon_meta = ctx.metadata.setdefault("axon", {})
    return axon_meta.setdefault("hook_timings_ms", {})


def _record_hook_timing(
    ctx: CallContext, *, phase: str, task: object, ms: float
) -> None:
    bucket = _timings_bucket(ctx)
    per_task = bucket.setdefault(phase, [])
    per_task.append({"task": type(task).__name__, "ms": ms})
    bucket[f"{phase}_total"] = bucket.get(f"{phase}_total", 0.0) + ms


class Axon:
    def __init__(
        self,
        adapter: LLMAdapter | None = None,
        tasks: Iterable[object] | None = None,
        config: AxonConfig | None = None,
    ) -> None:
        self._adapter = adapter
        self._tasks = _iter_tasks(tasks)
        self._config = config or AxonConfig()
        self._ctx_lock = threading.Lock()
        self._last_ctx: CallContext | None = None

    def register(self, client: Any) -> "Axon":
        patch_client(axon=self, client=client)
        return self

    def _set_last_ctx(self, ctx: CallContext) -> None:
        with self._ctx_lock:
            self._last_ctx = ctx

    def show_latency(self, phase: str) -> None:
        phase_map = {
            "before": "before_call",
            "after": "after_call",
            "before_call": "before_call",
            "after_call": "after_call",
        }
        key = phase_map.get(phase)
        if key is None:
            raise ValueError(
                'phase must be "before", "after", "before_call", or "after_call"'
            )

        with self._ctx_lock:
            ctx = self._last_ctx

        if ctx is None:
            print("Axon latency: no calls recorded yet.")
            return

        timings = ctx.metadata.get("axon", {}).get("hook_timings_ms", {})
        total = timings.get(f"{key}_total")
        items = timings.get(key, [])

        if total is None:
            print(
                f"Axon latency ({key}): timings not collected (enable collect_hook_timings=True)."
            )
            return

        print(f"Axon latency ({key}): total={total:.3f}ms")
        for item in items:
            task_name = item.get("task", "<unknown>")
            ms = item.get("ms", 0.0)
            print(f"- {task_name}: {ms:.3f}ms")

    def _run_before(self, request: LLMRequest, ctx: CallContext) -> LLMRequest:
        for task in self._tasks:
            hook = getattr(task, "before_call", None)
            if hook is None:
                continue
            try:
                if self._config.collect_hook_timings:
                    start = time.perf_counter()
                    updated = _maybe_await_in_sync(hook(request, ctx))
                    _record_hook_timing(
                        ctx,
                        phase="before_call",
                        task=task,
                        ms=(time.perf_counter() - start) * 1000.0,
                    )
                else:
                    updated = _maybe_await_in_sync(hook(request, ctx))
                if updated is not None:
                    request = updated
            except Exception as exc:
                if self._config.fail_fast:
                    raise
                raise AxonHookError(hook="before_call", task=task, cause=exc) from exc
        return request

    def _run_after(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> LLMResponse:
        if self._config.post_call_background:
            executor = _get_after_executor(self._config.background_max_workers)
            executor.submit(self._run_after_background, request, response, ctx)
            return response

        for task in self._tasks:
            hook = getattr(task, "after_call", None)
            if hook is None:
                continue
            try:
                if self._config.collect_hook_timings:
                    start = time.perf_counter()
                    updated = _maybe_await_in_sync(hook(request, response, ctx))
                    _record_hook_timing(
                        ctx,
                        phase="after_call",
                        task=task,
                        ms=(time.perf_counter() - start) * 1000.0,
                    )
                else:
                    updated = _maybe_await_in_sync(hook(request, response, ctx))
                if updated is not None:
                    response = updated
            except Exception as exc:
                if self._config.fail_fast:
                    raise
                raise AxonHookError(hook="after_call", task=task, cause=exc) from exc
        return response

    async def _arun_before(self, request: LLMRequest, ctx: CallContext) -> LLMRequest:
        for task in self._tasks:
            hook = getattr(task, "before_call", None)
            if hook is None:
                continue
            try:
                if self._config.collect_hook_timings:
                    start = time.perf_counter()
                    updated = await _maybe_await(hook(request, ctx))
                    _record_hook_timing(
                        ctx,
                        phase="before_call",
                        task=task,
                        ms=(time.perf_counter() - start) * 1000.0,
                    )
                else:
                    updated = await _maybe_await(hook(request, ctx))
                if updated is not None:
                    request = updated
            except Exception as exc:
                if self._config.fail_fast:
                    raise
                raise AxonHookError(hook="before_call", task=task, cause=exc) from exc
        return request

    async def _arun_after(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> LLMResponse:
        if self._config.post_call_background:
            executor = _get_after_executor(self._config.background_max_workers)
            executor.submit(self._run_after_background, request, response, ctx)
            return response

        for task in self._tasks:
            hook = getattr(task, "after_call", None)
            if hook is None:
                continue
            try:
                if self._config.collect_hook_timings:
                    start = time.perf_counter()
                    updated = await _maybe_await(hook(request, response, ctx))
                    _record_hook_timing(
                        ctx,
                        phase="after_call",
                        task=task,
                        ms=(time.perf_counter() - start) * 1000.0,
                    )
                else:
                    updated = await _maybe_await(hook(request, response, ctx))
                if updated is not None:
                    response = updated
            except Exception as exc:
                if self._config.fail_fast:
                    raise
                raise AxonHookError(hook="after_call", task=task, cause=exc) from exc
        return response

    def _run_after_background(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> None:
        for task in self._tasks:
            hook = getattr(task, "after_call", None)
            if hook is None:
                continue
            try:
                if self._config.collect_hook_timings:
                    start = time.perf_counter()
                    updated = _maybe_await_in_sync(hook(request, response, ctx))
                    _record_hook_timing(
                        ctx,
                        phase="after_call",
                        task=task,
                        ms=(time.perf_counter() - start) * 1000.0,
                    )
                else:
                    updated = _maybe_await_in_sync(hook(request, response, ctx))
                if updated is not None:
                    response = updated
            except Exception:
                # Background execution can't raise to the original caller, but we can still
                # make failures visible to the submitted Future when fail_fast=True.
                if self._config.fail_fast:
                    raise
                return

    def __call__(self, request: LLMRequest) -> LLMResponse:
        return self.call(request)

    def call(
        self, request: LLMRequest, *, ctx: CallContext | None = None
    ) -> LLMResponse:
        if self._adapter is None:
            raise RuntimeError(
                "No adapter configured. Use Axon(adapter=...) or Axon().register(client)."
            )
        ctx = ctx or CallContext()
        self._set_last_ctx(ctx)

        request = self._run_before(request, ctx)

        try:
            response = _maybe_await_in_sync(self._adapter.call(request, ctx))
        except Exception as exc:
            if self._config.fail_fast:
                raise
            raise AxonAdapterError(adapter=self._adapter, cause=exc) from exc

        return self._run_after(request, response, ctx)

    def call_text(
        self, text: str, *, model: str | None = None, **params: Any
    ) -> LLMResponse:
        req = LLMRequest(
            messages=[Message(role="user", content=text)], model=model, params=params
        )
        return self.call(req)
