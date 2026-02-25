import asyncio

from axon import Axon
from axon.types import LLMResponse, Message


def test_register_async_client_awaits_hooks_and_can_mutate_raw_response(mocker) -> None:
    async def run() -> None:
        from typing import Any

        class AsyncClient:
            responses: Any

        client = AsyncClient()
        responses = mocker.Mock()
        raw = mocker.Mock(output_text="hello")
        responses.create = mocker.AsyncMock(return_value=raw)
        client.responses = responses

        class Task:
            async def before_call(self, request, ctx):
                msg = Message(
                    role=request.messages[-1].role,
                    content=f"pre:{request.messages[-1].content}",
                )
                return type(request)(
                    messages=[*request.messages[:-1], msg],
                    model=request.model,
                    params=request.params,
                )

            async def after_call(self, request, response: LLMResponse, ctx):
                return LLMResponse(content="changed")

        Axon(tasks=[Task()]).llm.register(client)

        await client.responses.create(
            model="gpt-test",
            input=[{"role": "user", "content": "hi"}],
        )

        kwargs = responses.create.call_args.kwargs
        assert kwargs["input"] == [{"role": "user", "content": "pre:hi"}]
        assert raw.output_text == "changed"

    asyncio.run(run())


def test_before_and_after_registries_support_async_functions(mocker) -> None:
    async def run() -> None:
        from typing import Any

        class AsyncClient:
            responses: Any

        client = AsyncClient()
        responses = mocker.Mock()
        raw = mocker.Mock(output_text="hello")
        responses.create = mocker.AsyncMock(return_value=raw)
        client.responses = responses

        axon = Axon().llm.register(client)

        async def before(request, ctx):
            msg = Message(
                role=request.messages[-1].role,
                content=f"pre:{request.messages[-1].content}",
            )
            return type(request)(
                messages=[*request.messages[:-1], msg],
                model=request.model,
                params=request.params,
            )

        async def after(request, response: LLMResponse, ctx):
            return LLMResponse(content="changed")

        axon.before.register(before)
        axon.after.register(after)

        await client.responses.create(
            model="gpt-test",
            input=[{"role": "user", "content": "hi"}],
        )

        kwargs = responses.create.call_args.kwargs
        assert kwargs["input"] == [{"role": "user", "content": "pre:hi"}]
        assert raw.output_text == "changed"

    asyncio.run(run())
