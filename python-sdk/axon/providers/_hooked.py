from __future__ import annotations

import asyncio
import inspect
from collections.abc import Callable
from typing import Any, Protocol

from axon.types import CallContext, LLMRequest, LLMResponse


class KwargsToRequest(Protocol):
    def __call__(self, kwargs: dict[str, Any]) -> LLMRequest: ...


class RequestToKwargs(Protocol):
    def __call__(self, request: LLMRequest) -> dict[str, Any]: ...


class RawToResponse(Protocol):
    def __call__(self, raw: Any) -> LLMResponse: ...


class ApplyCanonicalToRaw(Protocol):
    def __call__(self, raw: Any, canonical: LLMResponse) -> None: ...


class HookedCreateProxy:
    def __init__(
        self,
        *,
        create: Callable[..., Any],
        is_async_client: bool = False,
        axon: Any,
        ctx_metadata: dict[str, Any],
        kwargs_to_request: KwargsToRequest,
        request_to_kwargs: RequestToKwargs,
        raw_to_response: RawToResponse,
        apply_canonical_to_raw: ApplyCanonicalToRaw | None = None,
    ) -> None:
        self._create = create
        self._axon = axon
        self._ctx_metadata = ctx_metadata
        self._kwargs_to_request = kwargs_to_request
        self._request_to_kwargs = request_to_kwargs
        self._raw_to_response = raw_to_response
        self._apply_canonical_to_raw = apply_canonical_to_raw
        # Some SDKs wrap async callables such that inspect.iscoroutinefunction()
        # returns False, but the client is still async (e.g. AsyncOpenAI).
        self._is_async = is_async_client or inspect.iscoroutinefunction(create)

    @property
    def is_async(self) -> bool:
        return self._is_async

    def _is_streaming(self, kwargs: dict[str, Any]) -> bool:
        return bool(kwargs.get("stream") is True)

    def _apply_after(self, *, request: LLMRequest, raw: Any, ctx: CallContext) -> None:
        canonical = self._raw_to_response(raw)
        canonical = self._axon._run_after(request, canonical, ctx)
        if canonical is None:  # defensive: treat as no-op
            canonical = self._raw_to_response(raw)

        if self._apply_canonical_to_raw is not None:
            try:
                self._apply_canonical_to_raw(raw, canonical)
            except Exception:
                pass

    def create(self, *args: Any, **kwargs: Any) -> Any:
        if self._is_async:
            raise RuntimeError("This client appears async; await create(...) instead.")

        ctx = CallContext(metadata=dict(self._ctx_metadata))
        self._axon._set_last_ctx(ctx)

        request = self._kwargs_to_request(kwargs)
        request = self._axon._run_before(request, ctx)
        create_kwargs = self._request_to_kwargs(request)
        raw = self._create(*args, **create_kwargs)

        if self._is_streaming(create_kwargs):
            return _HookedStream(
                stream=raw,
                proxy=self,
                request=request,
                ctx=ctx,
            )

        self._apply_after(request=request, raw=raw, ctx=ctx)
        return raw

    async def acreate(self, *args: Any, **kwargs: Any) -> Any:
        if not self._is_async:
            raise RuntimeError("This client appears sync; call create(...) instead.")

        ctx = CallContext(metadata=dict(self._ctx_metadata))
        self._axon._set_last_ctx(ctx)

        request = self._kwargs_to_request(kwargs)
        request = await self._axon._arun_before(request, ctx)
        create_kwargs = self._request_to_kwargs(request)
        raw = await self._create(*args, **create_kwargs)

        if self._is_streaming(create_kwargs):
            return _AsyncHookedStream(
                stream=raw,
                proxy=self,
                request=request,
                ctx=ctx,
            )

        canonical = self._raw_to_response(raw)
        canonical = await self._axon._arun_after(request, canonical, ctx)
        if canonical is None:  # defensive: treat as no-op
            canonical = self._raw_to_response(raw)

        if self._apply_canonical_to_raw is not None:
            try:
                self._apply_canonical_to_raw(raw, canonical)
            except Exception:
                pass

        return raw


class _HookedStream:
    def __init__(
        self,
        *,
        stream: Any,
        proxy: HookedCreateProxy,
        request: LLMRequest,
        ctx: CallContext,
    ) -> None:
        self._stream = stream
        self._it = iter(stream)
        self._proxy = proxy
        self._request = request
        self._ctx = ctx
        self._finalized = False
        self.final_response: Any | None = None

    def __iter__(self) -> "_HookedStream":
        return self

    def __next__(self) -> Any:
        try:
            return next(self._it)
        except StopIteration:
            self._finalize()
            raise

    def _get_final_response(self) -> Any | None:
        getter = getattr(self._stream, "get_final_response", None)
        if callable(getter):
            return getter()
        return None

    def _finalize(self) -> None:
        if self._finalized:
            return
        self._finalized = True

        final = self._get_final_response()
        if final is None:
            return
        if inspect.isawaitable(final):
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                final = asyncio.run(final)
            else:
                raise RuntimeError(
                    "Got awaitable final response in sync stream; use AsyncOpenAI."
                )

        self.final_response = final
        self._proxy._apply_after(request=self._request, raw=final, ctx=self._ctx)

    def get_final_response(self) -> Any:
        self._finalize()
        return self.final_response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._stream, name)


class _AsyncHookedStream:
    def __init__(
        self,
        *,
        stream: Any,
        proxy: HookedCreateProxy,
        request: LLMRequest,
        ctx: CallContext,
    ) -> None:
        self._stream = stream
        self._aiter = stream.__aiter__()
        self._proxy = proxy
        self._request = request
        self._ctx = ctx
        self._finalized = False
        self.final_response: Any | None = None

    def __aiter__(self) -> "_AsyncHookedStream":
        return self

    async def __anext__(self) -> Any:
        try:
            return await self._aiter.__anext__()
        except StopAsyncIteration:
            await self._afinalize()
            raise

    async def _aget_final_response(self) -> Any | None:
        getter = getattr(self._stream, "get_final_response", None)
        if not callable(getter):
            return None
        out = getter()
        if inspect.isawaitable(out):
            return await out
        return out

    async def _afinalize(self) -> None:
        if self._finalized:
            return
        self._finalized = True

        final = await self._aget_final_response()
        if final is None:
            return

        self.final_response = final
        canonical = self._proxy._raw_to_response(final)
        canonical = await self._proxy._axon._arun_after(
            self._request, canonical, self._ctx
        )
        if canonical is None:
            canonical = self._proxy._raw_to_response(final)

        if self._proxy._apply_canonical_to_raw is not None:
            try:
                self._proxy._apply_canonical_to_raw(final, canonical)
            except Exception:
                pass

    async def get_final_response(self) -> Any:
        await self._afinalize()
        return self.final_response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._stream, name)


class CreateFacade:
    def __init__(self, resource: Any, proxy: HookedCreateProxy) -> None:
        self._resource = resource
        self._proxy = proxy

    def __getattr__(self, name: str) -> Any:
        if name == "create":
            return self._proxy.acreate if self._proxy.is_async else self._proxy.create
        return getattr(self._resource, name)
