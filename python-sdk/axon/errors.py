from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class AxonError(Exception):
    """Base error for Axon."""


@dataclass(frozen=True, slots=True)
class AxonHookError(AxonError):
    hook: str
    task: Any
    cause: BaseException

    def __str__(self) -> str:
        return (
            f"{self.hook} hook failed for task {type(self.task).__name__}: {self.cause}"
        )


@dataclass(frozen=True, slots=True)
class AxonAdapterError(AxonError):
    adapter: Any
    cause: BaseException

    def __str__(self) -> str:
        return f"Adapter {type(self.adapter).__name__} failed: {self.cause}"


@dataclass(frozen=True, slots=True)
class UnsupportedLLMProviderError(AxonError):
    provider: str

    def __str__(self) -> str:
        return f"Unsupported LLM provider: {self.provider}"
