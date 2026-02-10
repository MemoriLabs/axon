"""Axon: a small, composable wrapper around LLM calls."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version

from axon.config import AxonConfig
from axon.core import Axon
from axon.types import CallContext, LLMRequest, LLMResponse, Message, Usage

try:
    __version__ = version("axon")
except PackageNotFoundError:  # pragma: no cover
    __version__ = "0.0.0"

__all__ = [
    "Axon",
    "AxonConfig",
    "CallContext",
    "LLMRequest",
    "LLMResponse",
    "Message",
    "Usage",
    "__version__",
]
