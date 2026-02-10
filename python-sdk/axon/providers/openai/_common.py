from __future__ import annotations

from typing import Any

from axon.types import LLMRequest, Message, Usage


def openai_input_to_messages(input_: Any) -> list[Message]:
    if isinstance(input_, str):
        return [Message(role="user", content=input_)]
    if not isinstance(input_, list):
        raise TypeError(
            "OpenAI input must be a string or a list of {role, content} dicts."
        )

    messages: list[Message] = []
    for item in input_:
        if not isinstance(item, dict):
            raise TypeError("OpenAI input list items must be dicts with role/content.")
        role = item.get("role")
        content = item.get("content")
        if role is None or content is None:
            raise TypeError("OpenAI input dicts must include role and content.")
        messages.append(Message(role=role, content=content))
    return messages


def messages_to_openai_input(request: LLMRequest) -> list[dict[str, str]]:
    return [{"role": m.role, "content": m.content} for m in request.messages]


def usage_from_openai(response: Any) -> Usage | None:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None

    # Responses API uses input/output_tokens; Chat Completions uses prompt/completion_tokens.
    prompt_tokens = getattr(usage, "input_tokens", None)
    if prompt_tokens is None:
        prompt_tokens = getattr(usage, "prompt_tokens", None)

    completion_tokens = getattr(usage, "output_tokens", None)
    if completion_tokens is None:
        completion_tokens = getattr(usage, "completion_tokens", None)
    total_tokens = getattr(usage, "total_tokens", None)
    if prompt_tokens is None and completion_tokens is None and total_tokens is None:
        return None

    return Usage(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
    )


def content_from_openai(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text:
        return output_text

    # Chat Completions API: choices[0].message.content
    choices = getattr(response, "choices", None)
    if isinstance(choices, list) and choices:
        first = choices[0]
        message = getattr(first, "message", None)
        content = getattr(message, "content", None)
        if isinstance(content, str):
            return content

    output = getattr(response, "output", None)
    if not isinstance(output, list):
        return ""

    parts: list[str] = []
    for item in output:
        content_items = getattr(item, "content", None)
        if not isinstance(content_items, list):
            continue
        for c in content_items:
            text = getattr(c, "text", None)
            if isinstance(text, str) and text:
                parts.append(text)

    return "\n".join(parts)
