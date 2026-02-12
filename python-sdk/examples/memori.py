from __future__ import annotations

import asyncio
import os
import uuid
from typing import Any, cast

from dotenv import load_dotenv
from openai import AsyncOpenAI

from axon import Axon
from axon.types import CallContext, LLMRequest, LLMResponse, Message

load_dotenv()

API_KEY = os.getenv("API_KEY")
API_TOKEN = os.getenv("API_TOKEN")

entity_id = "python-axon"
session_id = str(uuid.uuid4())


def get_memories(request: LLMRequest, ctx: CallContext) -> dict:
    import importlib

    requests = importlib.import_module("requests")
    payload = {
        "attribution": {"entity": {"id": entity_id}},
        "query": request.messages[-1].content,
        "session": {"id": session_id},
    }

    response = requests.post(
        "https://staging-api.memorilabs.ai/v1/hosted/recall",
        headers={
            "X-Memori-API-Key": API_KEY,
            "Authorization": f"Bearer {API_TOKEN}",
        },
        json=payload,
    )
    return response.json()


def inject_memories(request: LLMRequest, memories: dict) -> LLMRequest:
    print(memories)
    extra_messages = [
        Message(role=message["role"], content=message["text"])
        for message in memories["conversation"]["messages"]
    ]
    return type(request)(
        messages=[*request.messages, *extra_messages],
        model=request.model,
        params=request.params,
        metadata=request.metadata,
    )


def save_conversation(
    request: LLMRequest, response: LLMResponse, ctx: CallContext
) -> int:
    import importlib

    requests = importlib.import_module("requests")
    payload = {
        "attribution": {"entity": {"id": entity_id}},
        "messages": [
            {"role": "user", "type": None, "text": request.messages[-1].content},
            {"role": "assistant", "type": "text", "text": response.content},
        ],
        "session": {"id": session_id},
    }

    response = requests.post(
        "https://staging-api.memorilabs.ai/v1/hosted/conversation/messages",
        headers={
            "X-Memori-API-Key": API_KEY,
            "Authorization": f"Bearer {API_TOKEN}",
        },
        json=payload,
    )
    print(response.status_code)

    return response.status_code


def advanced_augmentation(
    request: LLMRequest, response: LLMResponse, ctx: CallContext
) -> int:
    import importlib

    requests = importlib.import_module("requests")
    payload = {
        "conversation": {
            "messages": [
                {"role": "user", "content": request.messages[-1].content},
                {"role": "assistant", "content": response.content},
            ],
            "summary": None,
        },
        "meta": {
            "attribution": {"entity": {"id": entity_id}},
            "framework": None,
            "llm": {"model": {"provider": "openai", "sdk": {"version": "2.8.1"}}},
            "platform": None,
            "sdk": {"lang": "python", "version": "3.1.6"},
            "storage": None,
        },
        "session": {"id": session_id},
    }

    response = requests.post(
        "https://staging-collector.memorilabs.ai/v1/hosted/augmentation",
        headers={
            "X-Memori-API-Key": API_KEY,
            "Authorization": f"Bearer {API_TOKEN}",
        },
        json=payload,
    )
    print(response.status_code)
    return response.status_code


def before(request: LLMRequest, ctx: CallContext) -> LLMRequest | None:
    memories = get_memories(request, ctx)
    request = inject_memories(request, memories)
    return request


def after(
    request: LLMRequest, response: LLMResponse, ctx: CallContext
) -> LLMResponse | None:
    save_conversation(request, response, ctx)
    advanced_augmentation(request, response, ctx)
    return None


def _delta_text(event: Any) -> str:
    choices = getattr(event, "choices", None)
    if not (isinstance(choices, list) and choices):
        return ""

    first = choices[0]
    delta = getattr(first, "delta", None)
    if delta is None:
        return ""

    content = getattr(delta, "content", None)
    if isinstance(content, str):
        return content

    if isinstance(delta, dict):
        content = delta.get("content")
        if isinstance(content, str):
            return content

    return ""


def _final_text(resp: Any) -> str:
    text = getattr(resp, "output_text", None)
    if isinstance(text, str) and text:
        return text
    return resp.choices[0].message.content


async def main() -> None:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    axon = Axon().llm.register(client)
    axon.before.register(before)
    axon.after.register(after)

    print("My favorite color is blue and I live in Paris")

    stream = cast(
        Any,
        await client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "user",
                    "content": "My favorite color is blue and I live in Paris",
                }
            ],
            stream=True,
        ),
    )
    async for event in stream:
        chunk = _delta_text(event)
        if chunk:
            print(chunk, end="", flush=True)
    print()

    resp = await stream.get_final_response()
    if resp is not None:
        print(_final_text(resp))

    await asyncio.sleep(5)

    print("What is my favorite color?")
    stream = cast(
        Any,
        await client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": "What is my favorite color?"}],
            stream=True,
        ),
    )
    async for event in stream:
        chunk = _delta_text(event)
        if chunk:
            print(chunk, end="", flush=True)
    print()

    resp = await stream.get_final_response()
    if resp is not None:
        print(_final_text(resp))

    await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
