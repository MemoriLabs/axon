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


_client_registrations: list[ClientRegistration] = []
_providers_loaded = False


def register_client(*, matcher: Matcher, patcher: Patcher) -> None:
    _client_registrations.append(ClientRegistration(matcher=matcher, patcher=patcher))


def _ensure_providers_loaded() -> None:
    global _providers_loaded
    if _providers_loaded:
        return
    import axon.providers  # noqa: F401

    _providers_loaded = True


def patch_client(*, axon: Any, client: Any) -> None:
    _ensure_providers_loaded()
    for reg in _client_registrations:
        if reg.matcher(client):
            reg.patcher(client, axon=axon)
            return

    provider = f"{type(client).__module__}.{type(client).__name__}"
    raise UnsupportedLLMProviderError(provider)
