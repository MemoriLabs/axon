import asyncio

from axon.providers.openai.adapter import (
    AsyncOpenAIChatCompletionsAdapter,
    AsyncOpenAIResponsesAdapter,
    OpenAIChatCompletionsAdapter,
    OpenAIResponsesAdapter,
)
from axon.types import LLMRequest, Message


def test_openai_adapter_calls_responses_create_and_parses_output(mocker) -> None:
    client = mocker.Mock()
    client.responses = mocker.Mock()

    resp = mocker.Mock()
    resp.output_text = "hello"
    resp.usage = mocker.Mock(input_tokens=1, output_tokens=2, total_tokens=3)

    client.responses.create.return_value = resp

    adapter = OpenAIResponsesAdapter(client, default_model="gpt-test")
    request = LLMRequest(
        messages=[Message(role="user", content="hi")], params={"temperature": 0.1}
    )

    out = adapter.call(request, ctx=None)

    client.responses.create.assert_called_once()
    kwargs = client.responses.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert kwargs["input"] == [{"role": "user", "content": "hi"}]
    assert kwargs["temperature"] == 0.1

    assert out.content == "hello"
    assert out.usage is not None
    assert out.usage.total_tokens == 3


def test_openai_chat_adapter_calls_chat_completions_create_and_parses_output(
    mocker,
) -> None:
    client = mocker.Mock()
    client.chat = mocker.Mock()
    client.chat.completions = mocker.Mock()

    msg = mocker.Mock()
    msg.content = "hello"
    choice = mocker.Mock()
    choice.message = msg

    resp = mocker.Mock()
    resp.choices = [choice]
    resp.usage = mocker.Mock(prompt_tokens=1, completion_tokens=2, total_tokens=3)

    client.chat.completions.create.return_value = resp

    adapter = OpenAIChatCompletionsAdapter(client, default_model="gpt-test")
    request = LLMRequest(
        messages=[Message(role="user", content="hi")], params={"temperature": 0.1}
    )

    out = adapter.call(request, ctx=None)

    client.chat.completions.create.assert_called_once()
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert kwargs["messages"] == [{"role": "user", "content": "hi"}]
    assert kwargs["temperature"] == 0.1

    assert out.content == "hello"
    assert out.usage is not None
    assert out.usage.total_tokens == 3


def test_async_openai_adapter_awaits_responses_create(mocker) -> None:
    async def run() -> None:
        client = mocker.Mock()
        client.responses = mocker.Mock()

        resp = mocker.Mock()
        resp.output_text = "hello"
        client.responses.create = mocker.AsyncMock(return_value=resp)

        adapter = AsyncOpenAIResponsesAdapter(client, default_model="gpt-test")
        request = LLMRequest(messages=[Message(role="user", content="hi")])

        out = await adapter.acall(request, ctx=None)

        client.responses.create.assert_awaited_once()
        assert out.content == "hello"

    asyncio.run(run())


def test_async_openai_chat_adapter_awaits_chat_completions_create(mocker) -> None:
    async def run() -> None:
        client = mocker.Mock()
        client.chat = mocker.Mock()
        client.chat.completions = mocker.Mock()

        msg = mocker.Mock()
        msg.content = "hello"
        choice = mocker.Mock()
        choice.message = msg

        resp = mocker.Mock()
        resp.choices = [choice]
        client.chat.completions.create = mocker.AsyncMock(return_value=resp)

        adapter = AsyncOpenAIChatCompletionsAdapter(client, default_model="gpt-test")
        request = LLMRequest(messages=[Message(role="user", content="hi")])

        out = await adapter.acall(request, ctx=None)

        client.chat.completions.create.assert_awaited_once()
        assert out.content == "hello"

    asyncio.run(run())


def test_register_wraps_openai_client_and_preserves_call_shape(mocker) -> None:
    from axon.core import Axon

    client = mocker.Mock()
    responses = mocker.Mock()
    responses.create.return_value = mocker.Mock(output_text="ok")
    client.responses = responses

    class AddPrefix:
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

    Axon(tasks=[AddPrefix()]).register(client)

    client.responses.create(model="gpt-test", input=[{"role": "user", "content": "hi"}])

    kwargs = responses.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert kwargs["input"] == [{"role": "user", "content": "pre:hi"}]


def test_register_wraps_openai_client_chat_completions_and_preserves_call_shape(
    mocker,
) -> None:
    from axon.core import Axon

    client = mocker.Mock()
    client.responses = mocker.Mock()

    chat = mocker.Mock()
    completions = mocker.Mock()
    completions.create.return_value = mocker.Mock(
        choices=[mocker.Mock(message=mocker.Mock(content="ok"))]
    )
    chat.completions = completions
    client.chat = chat

    class AddPrefix:
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

    Axon(tasks=[AddPrefix()]).register(client)

    client.chat.completions.create(
        model="gpt-test", messages=[{"role": "user", "content": "hi"}]
    )

    kwargs = completions.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert kwargs["messages"] == [{"role": "user", "content": "pre:hi"}]
