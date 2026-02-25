import builtins
import importlib
import sys
from typing import Any, cast

import pytest

from axon.errors import UnsupportedLLMProviderError
from axon.llm._registry import Matcher, Registry, register_llm_client


class _DummyLlmConfig:
    provider = None
    version = None
    model = None


class _DummyConfig:
    llm = _DummyLlmConfig()


class _DummyAxon:
    config = _DummyConfig()


def test_register_uses_first_matching_registration_in_order() -> None:
    original = list(Registry._clients)
    Registry._clients = []
    called: list[str] = []

    class MatchAny:
        def __call__(self, _client: Any) -> bool:
            return True

    matcher = cast(Matcher, MatchAny())

    @Registry.register_client(matcher)
    def first(_client, *, axon) -> None:
        called.append("first")

    @Registry.register_client(matcher)
    def second(_client, *, axon) -> None:
        called.append("second")

    try:
        register_llm_client(axon=_DummyAxon(), client=object())
        assert called == ["first"]
    finally:
        Registry._clients = original


def test_register_raises_for_unsupported_provider() -> None:
    original = list(Registry._clients)
    Registry._clients = []
    try:
        with pytest.raises(UnsupportedLLMProviderError):
            register_llm_client(axon=_DummyAxon(), client=object())
    finally:
        Registry._clients = original


def test_importing_axon_llm_does_not_require_provider_sdks(mocker) -> None:
    blocked_roots = {"openai", "anthropic", "google"}
    real_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        top_level = name.split(".", maxsplit=1)[0]
        if top_level in blocked_roots:
            raise ImportError(f"blocked import: {name}")
        return real_import(name, globals, locals, fromlist, level)

    for module_name in list(sys.modules):
        if module_name == "axon.llm" or module_name.startswith("axon.llm."):
            sys.modules.pop(module_name, None)
        if module_name.startswith("axon.providers.openai"):
            sys.modules.pop(module_name, None)

    mocker.patch.object(builtins, "__import__", side_effect=guarded_import)
    module = importlib.import_module("axon.llm")
    assert module is not None
