from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from axon.errors import UnsupportedLLMProviderError


class Matcher(Protocol):
    def __call__(self, client: Any) -> bool: ...


class Patcher(Protocol):
    def __call__(self, client: Any, *, axon: Any) -> None: ...


@dataclass(frozen=True, slots=True)
class ClientRegistration:
    matcher: Matcher
    patcher: Patcher


class Registry:
    _clients: list[ClientRegistration] = []

    @classmethod
    def register_client(cls, matcher: Matcher):
        def decorator(patcher: Patcher) -> Patcher:
            cls._clients.append(ClientRegistration(matcher=matcher, patcher=patcher))
            return patcher

        return decorator

    @classmethod
    def patch_client(cls, *, axon: Any, client: Any) -> None:
        for registration in cls._clients:
            if registration.matcher(client):
                registration.patcher(client, axon=axon)
                return
        provider = f"{type(client).__module__}.{type(client).__name__}"
        raise UnsupportedLLMProviderError(provider)


def register_llm_client(*, axon: Any, client: Any) -> Any:
    if client is None:
        raise RuntimeError("No client or framework model provided to register")
    Registry.patch_client(axon=axon, client=client)
    return axon
