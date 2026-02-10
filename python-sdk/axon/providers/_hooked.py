from __future__ import annotations

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
        self._is_async = inspect.iscoroutinefunction(create)

    @property
    def is_async(self) -> bool:
        return self._is_async

    def create(self, *args: Any, **kwargs: Any) -> Any:
        if self._is_async:
            raise RuntimeError("This client appears async; await create(...) instead.")

        ctx = CallContext(metadata=dict(self._ctx_metadata))
        self._axon._set_last_ctx(ctx)

        request = self._kwargs_to_request(kwargs)
        request = self._axon._run_before(request, ctx)
        raw = self._create(*args, **self._request_to_kwargs(request))

        canonical = self._raw_to_response(raw)
        canonical = self._axon._run_after(request, canonical, ctx)
        if canonical is None:  # defensive: treat as no-op
            canonical = self._raw_to_response(raw)

        if self._apply_canonical_to_raw is not None:
            try:
                self._apply_canonical_to_raw(raw, canonical)
            except Exception:
                pass

        return raw

    async def acreate(self, *args: Any, **kwargs: Any) -> Any:
        if not self._is_async:
            raise RuntimeError("This client appears sync; call create(...) instead.")

        ctx = CallContext(metadata=dict(self._ctx_metadata))
        self._axon._set_last_ctx(ctx)

        request = self._kwargs_to_request(kwargs)
        request = await self._axon._arun_before(request, ctx)
        raw = await self._create(*args, **self._request_to_kwargs(request))

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


class CreateFacade:
    def __init__(self, resource: Any, proxy: HookedCreateProxy) -> None:
        self._resource = resource
        self._proxy = proxy

    def __getattr__(self, name: str) -> Any:
        if name == "create":
            return self._proxy.acreate if self._proxy.is_async else self._proxy.create
        return getattr(self._resource, name)
