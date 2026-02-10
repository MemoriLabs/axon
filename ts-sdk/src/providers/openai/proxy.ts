import type { LLMRequest, LLMResponse } from "../../types.js";
import { createHookedCreate } from "../_hooked.js";
import { contentFromOpenAI, messagesToOpenAIInput, openaiInputToMessages, usageFromOpenAI } from "./common.js";

function responsesKwargsToRequest(kwargs: Record<string, unknown>): LLMRequest {
  const model = kwargs.model as string | undefined;
  const input = kwargs.input as any;
  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.input;
  return { messages: openaiInputToMessages(input), model, params };
}

function requestToResponsesKwargs(request: LLMRequest): Record<string, unknown> {
  if (!request.model) {
    throw new Error("No model provided (set model in the OpenAI call or via a before-hook).");
  }
  return { model: request.model, input: messagesToOpenAIInput(request), ...(request.params ?? {}) };
}

function chatKwargsToRequest(kwargs: Record<string, unknown>): LLMRequest {
  const model = kwargs.model as string | undefined;
  const messages = kwargs.messages as any;
  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.messages;
  return { messages: openaiInputToMessages(messages), model, params };
}

function requestToChatKwargs(request: LLMRequest): Record<string, unknown> {
  if (!request.model) {
    throw new Error("No model provided (set model in the OpenAI call or via a before-hook).");
  }
  return { model: request.model, messages: messagesToOpenAIInput(request), ...(request.params ?? {}) };
}

function rawToCanonical(raw: any): LLMResponse {
  return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
}

function applyResponsesText(raw: any, canonical: LLMResponse): void {
  if (typeof raw?.output_text === "string" && canonical.content !== raw.output_text) {
    raw.output_text = canonical.content;
  }
}

function applyChatText(raw: any, canonical: LLMResponse): void {
  const msg = raw?.choices?.[0]?.message;
  if (msg && typeof msg.content === "string") {
    msg.content = canonical.content;
  }
}

export function patchOpenAIClient(client: any, axon: any): void {
  let patchedAny = false;

  if (client.responses?.create && !client.responses.__axon_patched__) {
    const original = client.responses.create.bind(client.responses);
    client.responses.create = createHookedCreate({
      create: original,
      axon,
      ctxMetadata: { provider: "openai", method: "responses.create" },
      kwargsToRequest: responsesKwargsToRequest,
      requestToKwargs: requestToResponsesKwargs,
      rawToResponse: rawToCanonical,
      applyCanonicalToRaw: applyResponsesText,
    });
    client.responses.__axon_patched__ = true;
    patchedAny = true;
  } else if (client.responses?.create) {
    patchedAny = true;
  }

  if (client.chat?.completions?.create && !client.chat.completions.__axon_patched__) {
    const original = client.chat.completions.create.bind(client.chat.completions);
    client.chat.completions.create = createHookedCreate({
      create: original,
      axon,
      ctxMetadata: { provider: "openai", method: "chat.completions.create" },
      kwargsToRequest: chatKwargsToRequest,
      requestToKwargs: requestToChatKwargs,
      rawToResponse: rawToCanonical,
      applyCanonicalToRaw: applyChatText,
    });
    client.chat.completions.__axon_patched__ = true;
    patchedAny = true;
  } else if (client.chat?.completions?.create) {
    patchedAny = true;
  }

  if (!patchedAny) {
    throw new Error("OpenAI client has no .responses.create or .chat.completions.create method.");
  }
}
