import threading
import time

import pytest

from axon import Axon
from axon.errors import AxonHookError
from axon.types import LLMResponse, Message


def test_register_runs_before_and_after_hooks_and_can_mutate_request_and_response(
    mocker,
) -> None:
    client = mocker.Mock()
    responses = mocker.Mock()
    raw = mocker.Mock(output_text="hello")
    responses.create.return_value = raw
    client.responses = responses

    class Prefix:
        def before_call(self, request, ctx):
            msg = Message(
                role=request.messages[-1].role,
                content=f"pre:{request.messages[-1].content}",
            )
            return type(request)(
                messages=[*request.messages[:-1], msg],
                model=request.model,
                params=request.params,
            )

    class Suffix:
        def after_call(self, request, response: LLMResponse, ctx):
            return LLMResponse(content=f"{response.content}:post")

    Axon(tasks=[Prefix(), Suffix()]).llm.register(client)

    client.responses.create(model="gpt-test", input=[{"role": "user", "content": "hi"}])

    kwargs = responses.create.call_args.kwargs
    assert kwargs["input"] == [{"role": "user", "content": "pre:hi"}]
    assert raw.output_text == "hello:post"


def test_before_and_after_registries_can_register_functions(mocker) -> None:
    client = mocker.Mock()
    responses = mocker.Mock()
    raw = mocker.Mock(output_text="hello")
    responses.create.return_value = raw
    client.responses = responses

    axon = Axon().llm.register(client)

    def before(request, ctx):
        msg = Message(
            role=request.messages[-1].role,
            content=f"pre:{request.messages[-1].content}",
        )
        return type(request)(
            messages=[*request.messages[:-1], msg],
            model=request.model,
            params=request.params,
        )

    def after(request, response: LLMResponse, ctx):
        return LLMResponse(content=f"{response.content}:post")

    axon.before.register(before)
    axon.after.register(after)

    client.responses.create(model="gpt-test", input=[{"role": "user", "content": "hi"}])

    kwargs = responses.create.call_args.kwargs
    assert kwargs["input"] == [{"role": "user", "content": "pre:hi"}]
    assert raw.output_text == "hello:post"


def test_register_sync_can_run_async_hooks_when_no_event_loop(mocker) -> None:
    client = mocker.Mock()
    responses = mocker.Mock()
    raw = mocker.Mock(output_text="hello")
    responses.create.return_value = raw
    client.responses = responses

    class AsyncTasks:
        async def before_call(self, request, ctx):
            msg = Message(
                role=request.messages[-1].role,
                content=f"apre:{request.messages[-1].content}",
            )
            return type(request)(
                messages=[*request.messages[:-1], msg],
                model=request.model,
                params=request.params,
            )

        async def after_call(self, request, response: LLMResponse, ctx):
            return LLMResponse(content=f"{response.content}:apost")

    Axon(tasks=[AsyncTasks()]).llm.register(client)

    client.responses.create(model="gpt-test", input=[{"role": "user", "content": "hi"}])

    kwargs = responses.create.call_args.kwargs
    assert kwargs["input"] == [{"role": "user", "content": "apre:hi"}]
    assert raw.output_text == "hello:apost"


def test_register_wraps_hook_error(mocker) -> None:
    client = mocker.Mock()
    responses = mocker.Mock()
    responses.create.return_value = mocker.Mock(output_text="hello")
    client.responses = responses

    class Boom:
        def before_call(self, request, ctx):
            raise ValueError("nope")

    Axon(tasks=[Boom()]).llm.register(client)

    with pytest.raises(AxonHookError) as exc:
        client.responses.create(
            model="gpt-test",
            input=[{"role": "user", "content": "hi"}],
        )

    assert exc.value.hook == "before_call"


def test_after_hooks_run(mocker) -> None:
    client = mocker.Mock()
    responses = mocker.Mock()
    responses.create.return_value = mocker.Mock(output_text="hello")
    client.responses = responses

    done = threading.Event()

    class SlowAfter:
        def after_call(self, request, response: LLMResponse, ctx):
            time.sleep(0.01)
            done.set()
            return None

    Axon(tasks=[SlowAfter()]).llm.register(client)
    client.responses.create(model="gpt-test", input=[{"role": "user", "content": "hi"}])
    assert done.wait(1.0)
