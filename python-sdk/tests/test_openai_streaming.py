import asyncio

from axon import Axon
from axon.types import LLMResponse


class _SyncStream:
    def __init__(self, events, final_response) -> None:
        self._events = list(events)
        self._final = final_response
        self._i = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self._i >= len(self._events):
            raise StopIteration
        item = self._events[self._i]
        self._i += 1
        return item

    def get_final_response(self):
        return self._final


class _AsyncStream:
    def __init__(self, events, final_response) -> None:
        self._events = list(events)
        self._final = final_response
        self._i = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._i >= len(self._events):
            raise StopAsyncIteration
        item = self._events[self._i]
        self._i += 1
        return item

    async def get_final_response(self):
        return self._final


def test_register_supports_sync_streaming_and_runs_after_call_on_completion(
    mocker,
) -> None:
    client = mocker.Mock()
    client.responses = mocker.Mock()

    final = mocker.Mock()
    final.output_text = "hello"
    stream = _SyncStream(events=[{"type": "delta", "text": "he"}], final_response=final)
    client.responses.create.return_value = stream

    after_contents: list[str] = []

    class Task:
        def after_call(self, request, response: LLMResponse, ctx):
            after_contents.append(response.content)
            return None

    Axon(tasks=[Task()]).llm.register(client)

    out = client.responses.create(
        model="gpt-test",
        input=[{"role": "user", "content": "hi"}],
        stream=True,
    )
    for _ in out:
        pass

    assert after_contents == ["hello"]


def test_register_supports_async_streaming_and_runs_after_call_on_completion(
    mocker,
) -> None:
    async def run() -> None:
        client = mocker.Mock()
        client.responses = mocker.Mock()

        final = mocker.Mock()
        final.output_text = "hello"
        stream = _AsyncStream(
            events=[{"type": "delta", "text": "he"}], final_response=final
        )
        client.responses.create = mocker.AsyncMock(return_value=stream)

        after_contents: list[str] = []

        class Task:
            async def after_call(self, request, response: LLMResponse, ctx):
                after_contents.append(response.content)
                return None

        Axon(tasks=[Task()]).llm.register(client)

        out = await client.responses.create(
            model="gpt-test",
            input=[{"role": "user", "content": "hi"}],
            stream=True,
        )
        async for _ in out:
            pass

        assert after_contents == ["hello"]

    asyncio.run(run())
