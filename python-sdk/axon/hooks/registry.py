from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal

from axon.types import CallContext, LLMRequest, LLMResponse


def _callable_label(fn: Callable[..., Any]) -> str:
    label = getattr(fn, "__qualname__", None) or getattr(fn, "__name__", None)
    if not isinstance(label, str) or not label:
        return "hook"
    return label


def _sanitize_type_name(name: str) -> str:
    out = []
    for ch in name:
        out.append(ch if (ch.isalnum() or ch == "_") else "_")
    return "".join(out)[:80] or "Hook"


def _wrap_before_hook(fn: Callable[[LLMRequest, CallContext], Any]) -> object:
    type_name = _sanitize_type_name(f"AxonBefore_{_callable_label(fn)}")

    def before_call(self, request: LLMRequest, ctx: CallContext) -> Any:
        return fn(request, ctx)

    return type(type_name, (), {"before_call": before_call})()


def _wrap_after_hook(
    fn: Callable[[LLMRequest, LLMResponse, CallContext], Any],
) -> object:
    type_name = _sanitize_type_name(f"AxonAfter_{_callable_label(fn)}")

    def after_call(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> Any:
        return fn(request, response, ctx)

    return type(type_name, (), {"after_call": after_call})()


class HookRegistry:
    def __init__(self, axon: Any, *, phase: Literal["before", "after"]) -> None:
        self._axon = axon
        self._phase = phase

    def register(self, fn: Callable[..., Any] | None = None) -> Any:
        if fn is None:

            def decorator(f: Callable[..., Any]) -> Callable[..., Any]:
                self.register(f)
                return f

            return decorator

        task = (
            _wrap_before_hook(fn) if self._phase == "before" else _wrap_after_hook(fn)
        )
        self._axon._tasks.append(task)
        return fn

    add = register
