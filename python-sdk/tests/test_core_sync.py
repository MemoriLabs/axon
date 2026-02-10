import pytest
import threading
import time

from axon.config import AxonConfig
from axon.core import Axon
from axon.errors import AxonHookError
from axon.types import CallContext, LLMRequest, LLMResponse, Message


class DummyAdapter:
    def __init__(self) -> None:
        self.last_request: LLMRequest | None = None

    def call(self, request: LLMRequest, ctx) -> LLMResponse:
        self.last_request = request
        return LLMResponse(content=request.messages[-1].content)


class PrefixTask:
    def before_call(self, request: LLMRequest, ctx) -> LLMRequest:
        msg = Message(
            role=request.messages[-1].role,
            content=f"pre:{request.messages[-1].content}",
        )
        return LLMRequest(
            messages=[*request.messages[:-1], msg],
            model=request.model,
            params=request.params,
            metadata=request.metadata,
        )


class SuffixTask:
    def after_call(
        self, request: LLMRequest, response: LLMResponse, ctx
    ) -> LLMResponse:
        return LLMResponse(
            content=f"{response.content}:post", usage=response.usage, raw=response.raw
        )


class AsyncTasks:
    async def before_call(self, request: LLMRequest, ctx) -> LLMRequest:
        msg = Message(
            role=request.messages[-1].role,
            content=f"apre:{request.messages[-1].content}",
        )
        return LLMRequest(
            messages=[*request.messages[:-1], msg],
            model=request.model,
            params=request.params,
        )

    async def after_call(
        self, request: LLMRequest, response: LLMResponse, ctx
    ) -> LLMResponse:
        return LLMResponse(content=f"{response.content}:apost")


def test_sync_core_runs_tasks_in_order_and_mutates_request() -> None:
    adapter = DummyAdapter()
    axon = Axon(adapter=adapter, tasks=[PrefixTask(), SuffixTask()])

    req = LLMRequest(messages=[Message(role="user", content="hi")])
    resp = axon.call(req)

    assert adapter.last_request is not None
    assert adapter.last_request.messages[-1].content == "pre:hi"
    assert resp.content == "pre:hi:post"


def test_sync_core_can_run_async_tasks_when_no_event_loop() -> None:
    adapter = DummyAdapter()
    axon = Axon(adapter=adapter, tasks=[AsyncTasks()])

    req = LLMRequest(messages=[Message(role="user", content="hi")])
    resp = axon.call(req)

    assert adapter.last_request is not None
    assert adapter.last_request.messages[-1].content == "apre:hi"
    assert resp.content == "apre:hi:apost"


def test_sync_core_wraps_hook_error_when_fail_fast_false() -> None:
    class Boom:
        def before_call(self, request: LLMRequest, ctx) -> LLMRequest:
            raise ValueError("nope")

    adapter = DummyAdapter()
    axon = Axon(adapter=adapter, tasks=[Boom()], config=AxonConfig(fail_fast=False))

    with pytest.raises(AxonHookError) as exc:
        axon.call(LLMRequest(messages=[Message(role="user", content="hi")]))

    assert exc.value.hook == "before_call"


def test_after_hooks_can_run_in_background() -> None:
    done = threading.Event()

    class SlowAfter:
        def after_call(
            self, request: LLMRequest, response: LLMResponse, ctx
        ) -> LLMResponse:
            time.sleep(0.2)
            done.set()
            return LLMResponse(content=f"{response.content}:post")

    adapter = DummyAdapter()
    axon = Axon(
        adapter=adapter,
        tasks=[SlowAfter()],
        config=AxonConfig(post_call_background=True),
    )

    start = time.monotonic()
    resp = axon.call(LLMRequest(messages=[Message(role="user", content="hi")]))
    elapsed = time.monotonic() - start

    assert resp.content == "hi"
    assert elapsed < 0.15
    assert done.wait(1.0)


def test_collect_hook_timings_records_before_call_latency() -> None:
    class SlowBefore:
        def before_call(self, request: LLMRequest, ctx) -> LLMRequest:
            time.sleep(0.05)
            return request

    adapter = DummyAdapter()
    axon = Axon(
        adapter=adapter,
        tasks=[SlowBefore()],
        config=AxonConfig(collect_hook_timings=True),
    )
    ctx = CallContext()

    axon.call(LLMRequest(messages=[Message(role="user", content="hi")]), ctx=ctx)

    timings = ctx.metadata["axon"]["hook_timings_ms"]
    assert timings["before_call_total"] >= 10.0
    assert timings["before_call"][0]["task"] == "SlowBefore"


def test_show_latency_prints_latest_before_call_timings(capsys) -> None:
    class SlowBefore:
        def before_call(self, request: LLMRequest, ctx) -> LLMRequest:
            time.sleep(0.02)
            return request

    adapter = DummyAdapter()
    axon = Axon(
        adapter=adapter,
        tasks=[SlowBefore()],
        config=AxonConfig(collect_hook_timings=True),
    )

    axon.call(LLMRequest(messages=[Message(role="user", content="hi")]))
    axon.show_latency("before")

    out = capsys.readouterr().out
    assert "Axon latency (before_call)" in out
