from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AxonConfig:
    """Runtime configuration for Axon."""

    fail_fast: bool = True
    post_call_background: bool = False
    background_max_workers: int | None = None
    collect_hook_timings: bool = False
