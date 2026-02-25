from axon.types import Message


def test_register_wraps_openai_client_and_preserves_call_shape(mocker) -> None:
    from axon import Axon

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

    Axon(tasks=[AddPrefix()]).llm.register(client)

    client.responses.create(model="gpt-test", input=[{"role": "user", "content": "hi"}])

    kwargs = responses.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert kwargs["input"] == [{"role": "user", "content": "pre:hi"}]


def test_register_wraps_openai_client_chat_completions_and_preserves_call_shape(
    mocker,
) -> None:
    from axon import Axon

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

    Axon(tasks=[AddPrefix()]).llm.register(client)

    client.chat.completions.create(
        model="gpt-test", messages=[{"role": "user", "content": "hi"}]
    )

    kwargs = completions.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert kwargs["messages"] == [{"role": "user", "content": "pre:hi"}]
