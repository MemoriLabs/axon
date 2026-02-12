import type { Axon } from '../../core/axon.js';
import { HookedCreateProxy, CreateFacade } from '../../hooks/hooked.js';
import type {
  OpenAIResponsesCreateArgs,
  OpenAIChatCompletionsCreateArgs,
  OpenAIClient,
} from './types.js';
import {
  openaiInputToMessages,
  messagesToOpenAIInput,
  contentFromOpenAI,
  usageFromOpenAI,
  applyContentToTextResponse,
  applyContentToChatResponse,
} from './common.js';
import { LLMRequest, LLMResponse } from '../../types/index.js';
import { isOpenAIClient } from './detect.js';

// Track patched objects to prevent double-wrapping
const patchedObjects = new WeakSet<any>();

// --- Converters ---

function responsesKwargsToRequest(kwargs: OpenAIResponsesCreateArgs): LLMRequest {
  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.input;
  return { messages: openaiInputToMessages(kwargs.input), model: kwargs.model, params };
}

function requestToResponsesKwargs(request: LLMRequest): OpenAIResponsesCreateArgs {
  if (!request.model) throw new Error('No model provided.');
  return {
    model: request.model,
    input: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  } as OpenAIResponsesCreateArgs;
}

function chatKwargsToRequest(kwargs: OpenAIChatCompletionsCreateArgs): LLMRequest {
  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.messages;
  return { messages: openaiInputToMessages(kwargs.messages), model: kwargs.model, params };
}

function requestToChatKwargs(request: LLMRequest): OpenAIChatCompletionsCreateArgs {
  if (!request.model) throw new Error('No model provided.');
  return {
    model: request.model,
    messages: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  } as OpenAIChatCompletionsCreateArgs;
}

function rawToCanonical(raw: unknown): LLMResponse {
  return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
}

function chunkToText(chunk: any): string | undefined {
  if (chunk.choices?.[0]?.delta?.content) return chunk.choices[0].delta.content;
  if (chunk.output_text) return chunk.output_text;
  return undefined;
}

// --- Patcher ---

export function patchOpenAIClient(client: unknown, axon: Axon): void {
  const openaiClient = client as OpenAIClient;
  let patchedAny = false;

  // Patch Responses API
  if (openaiClient.responses?.create && !patchedObjects.has(openaiClient.responses)) {
    patchedAny = true;
    const proxy = new HookedCreateProxy<OpenAIResponsesCreateArgs, any>({
      create: openaiClient.responses.create.bind(openaiClient.responses),
      axon,
      ctxMetadata: { provider: 'openai', method: 'responses.create' },
      kwargsToRequest: responsesKwargsToRequest,
      requestToKwargs: requestToResponsesKwargs,
      rawToResponse: rawToCanonical,
      applyCanonicalToRaw: applyContentToTextResponse,
      chunkToText,
    });

    const wrapped = CreateFacade.wrap(openaiClient.responses, proxy);
    openaiClient.responses = wrapped;
    patchedObjects.add(wrapped);
  } else if (openaiClient.responses && patchedObjects.has(openaiClient.responses)) {
    patchedAny = true; // Already patched
  }

  // Patch Chat Completions API
  if (
    openaiClient.chat?.completions?.create &&
    !patchedObjects.has(openaiClient.chat.completions)
  ) {
    patchedAny = true;
    const proxy = new HookedCreateProxy<OpenAIChatCompletionsCreateArgs, any>({
      create: openaiClient.chat.completions.create.bind(openaiClient.chat.completions),
      axon,
      ctxMetadata: { provider: 'openai', method: 'chat.completions.create' },
      kwargsToRequest: chatKwargsToRequest,
      requestToKwargs: requestToChatKwargs,
      rawToResponse: rawToCanonical,
      applyCanonicalToRaw: applyContentToChatResponse,
      chunkToText,
    });

    if (openaiClient.chat) {
      const wrapped = CreateFacade.wrap(openaiClient.chat.completions, proxy);
      openaiClient.chat.completions = wrapped;
      patchedObjects.add(wrapped);
    }
  } else if (openaiClient.chat?.completions && patchedObjects.has(openaiClient.chat.completions)) {
    patchedAny = true; // Already patched
  }

  // If we found APIs but they were already patched, we consider that a success (idempotent)
  if (!patchedAny && !isOpenAIClient(client)) {
    throw new Error('OpenAI client has no patchable APIs.');
  }
}
