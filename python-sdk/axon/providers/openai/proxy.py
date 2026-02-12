from __future__ import annotations

from typing import Any

from axon.providers._hooked import CreateFacade, HookedCreateProxy
from axon.providers.openai._common import (
    content_from_openai,
    messages_to_openai_input,
    openai_input_to_messages,
    usage_from_openai,
)
from axon.types import LLMRequest, LLMResponse


def _kwargs_to_request(kwargs: dict[str, Any]) -> LLMRequest:
    model = kwargs.get("model")
    input_ = kwargs.get("input")
    params = {k: v for k, v in kwargs.items() if k not in {"model", "input"}}
    return LLMRequest(
        messages=openai_input_to_messages(input_), model=model, params=params
    )


def _request_to_kwargs(request: LLMRequest) -> dict[str, Any]:
    if request.model is None:
        raise ValueError(
            "No model provided (set model in the OpenAI call or via a before-hook)."
        )
    return {
        "model": request.model,
        "input": messages_to_openai_input(request),
        **dict(request.params),
    }


def _chat_kwargs_to_request(kwargs: dict[str, Any]) -> LLMRequest:
    model = kwargs.get("model")
    messages = kwargs.get("messages")
    params = {k: v for k, v in kwargs.items() if k not in {"model", "messages"}}
    return LLMRequest(
        messages=openai_input_to_messages(messages), model=model, params=params
    )


def _request_to_chat_kwargs(request: LLMRequest) -> dict[str, Any]:
    if request.model is None:
        raise ValueError(
            "No model provided (set model in the OpenAI call or via a before-hook)."
        )
    return {
        "model": request.model,
        "messages": messages_to_openai_input(request),
        **dict(request.params),
    }


def _raw_to_canonical(raw: Any) -> LLMResponse:
    return LLMResponse(
        content=content_from_openai(raw), usage=usage_from_openai(raw), raw=raw
    )


def _apply_responses_text(raw: Any, canonical: LLMResponse) -> None:
    output_text = getattr(raw, "output_text", None)
    if isinstance(output_text, str) and canonical.content != output_text:
        setattr(raw, "output_text", canonical.content)


def _apply_chat_text(raw: Any, canonical: LLMResponse) -> None:
    choices = getattr(raw, "choices", None)
    if not (isinstance(choices, list) and choices):
        return
    first = choices[0]
    message = getattr(first, "message", None)
    if message is None or not hasattr(message, "content"):
        return
    setattr(message, "content", canonical.content)


def _patch_openai_chat_completions(client: Any, *, axon: Any) -> bool:
    chat = getattr(client, "chat", None)
    if chat is None:
        return False

    completions = getattr(chat, "completions", None)
    if completions is None:
        return False

    if getattr(completions, "__axon_patched__", False):
        return True

    create = getattr(completions, "create", None)
    if create is None:
        return False

    is_async_client = "Async" in type(client).__name__
    proxy = HookedCreateProxy(
        create=create,
        is_async_client=is_async_client,
        axon=axon,
        ctx_metadata={"provider": "openai", "method": "chat.completions.create"},
        kwargs_to_request=_chat_kwargs_to_request,
        request_to_kwargs=_request_to_chat_kwargs,
        raw_to_response=_raw_to_canonical,
        apply_canonical_to_raw=_apply_chat_text,
    )

    wrapped = CreateFacade(completions, proxy)
    setattr(wrapped, "__axon_patched__", True)
    setattr(wrapped, "__axon_original__", completions)
    chat.completions = wrapped
    return True


def patch_openai_client(client: Any, *, axon: Any) -> None:
    patched_any = False
    is_async_client = "Async" in type(client).__name__

    existing = getattr(client, "responses", None)
    if existing is not None:
        if getattr(existing, "__axon_patched__", False):
            patched_any = True
        else:
            create = getattr(existing, "create", None)
            if create is not None:
                proxy = HookedCreateProxy(
                    create=create,
                    is_async_client=is_async_client,
                    axon=axon,
                    ctx_metadata={"provider": "openai", "method": "responses.create"},
                    kwargs_to_request=_kwargs_to_request,
                    request_to_kwargs=_request_to_kwargs,
                    raw_to_response=_raw_to_canonical,
                    apply_canonical_to_raw=_apply_responses_text,
                )
                wrapped = CreateFacade(existing, proxy)
                setattr(wrapped, "__axon_patched__", True)
                setattr(wrapped, "__axon_original__", existing)
                client.responses = wrapped
                patched_any = True

    if _patch_openai_chat_completions(client, axon=axon):
        patched_any = True

    if not patched_any:
        raise ValueError(
            "OpenAI client has no .responses or .chat.completions attribute."
        )
