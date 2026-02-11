import { Axon } from '@/core/axon.js';
import { HookedCreateProxy, CreateFacade } from '@/hooks/hooked.js';
import { LLMRequest } from '@/types/request.js';
import { LLMResponse } from '@/types/response.js';
import {
  openaiInputToMessages,
  messagesToOpenAIInput,
  contentFromOpenAI,
  usageFromOpenAI,
} from './common.js';

interface OpenAIResponsesClientLike {
  responses: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
}

interface OpenAIChatCompletionsClientLike {
  chat: {
    completions: {
      create: (args: Record<string, unknown>) => Promise<unknown>;
      __axon_patched__?: boolean;
    };
  };
}

type OpenAIClientLike = Partial<OpenAIResponsesClientLike> &
  Partial<OpenAIChatCompletionsClientLike>;

function responsesKwargsToRequest(kwargs: Record<string, unknown>): LLMRequest {
  const model = kwargs.model as string | undefined;
  const input = kwargs.input;
  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.input;
  return { messages: openaiInputToMessages(input), model, params };
}

function requestToResponsesKwargs(request: LLMRequest): Record<string, unknown> {
  if (!request.model) {
    throw new Error('No model provided (set model in the OpenAI call or via a before-hook).');
  }
  return { model: request.model, input: messagesToOpenAIInput(request), ...(request.params ?? {}) };
}

function chatKwargsToRequest(kwargs: Record<string, unknown>): LLMRequest {
  const model = kwargs.model as string | undefined;
  const messages = kwargs.messages;
  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.messages;
  return { messages: openaiInputToMessages(messages), model, params };
}

function requestToChatKwargs(request: LLMRequest): Record<string, unknown> {
  if (!request.model) {
    throw new Error('No model provided (set model in the OpenAI call or via a before-hook).');
  }
  return {
    model: request.model,
    messages: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  };
}

function rawToCanonical(raw: unknown): LLMResponse {
  return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
}

function applyResponsesText(raw: unknown, canonical: LLMResponse): void {
  if (!raw || typeof raw !== 'object') return;
  const obj = raw as { output_text?: unknown };
  if (typeof obj.output_text === 'string' && canonical.content !== obj.output_text) {
    obj.output_text = canonical.content;
  }
}

function applyChatText(raw: unknown, canonical: LLMResponse): void {
  if (!raw || typeof raw !== 'object') return;
  const obj = raw as { choices?: unknown };
  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) return;
  const first = choices[0] as { message?: { content?: unknown } };
  if (first.message && typeof first.message.content === 'string') {
    first.message.content = canonical.content;
  }
}

export function patchOpenAIClient(client: unknown, axon: Axon): void {
  // Cast to the expected type after receiving unknown
  const openaiClient = client as OpenAIClientLike;
  let patchedAny = false;

  // Patch responses API if it exists
  if (openaiClient.responses && typeof openaiClient.responses.create === 'function') {
    if (!openaiClient.responses.__axon_patched__) {
      const originalCreate = openaiClient.responses.create.bind(openaiClient.responses);

      // Wrap to match HookedCreateProxy's expected signature
      const wrappedCreate = async (input: unknown): Promise<unknown> => {
        return await originalCreate(input as Record<string, unknown>);
      };

      const proxy = new HookedCreateProxy({
        create: wrappedCreate,
        axon,
        ctxMetadata: { provider: 'openai', method: 'responses.create' },
        kwargsToRequest: responsesKwargsToRequest,
        requestToKwargs: requestToResponsesKwargs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyResponsesText,
      });

      // Replace the entire responses resource with a facade
      const facade = CreateFacade.wrap(openaiClient.responses, proxy);
      openaiClient.responses = facade as typeof openaiClient.responses;
      patchedAny = true;
    } else {
      patchedAny = true;
    }
  }

  // Patch chat.completions API if it exists
  const chatCompletions = openaiClient.chat?.completions;
  if (chatCompletions && typeof chatCompletions.create === 'function') {
    if (!chatCompletions.__axon_patched__) {
      const originalCreate = chatCompletions.create.bind(chatCompletions);

      // Wrap to match HookedCreateProxy's expected signature
      const wrappedCreate = async (input: unknown): Promise<unknown> => {
        return await originalCreate(input as Record<string, unknown>);
      };

      const proxy = new HookedCreateProxy({
        create: wrappedCreate,
        axon,
        ctxMetadata: { provider: 'openai', method: 'chat.completions.create' },
        kwargsToRequest: chatKwargsToRequest,
        requestToKwargs: requestToChatKwargs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyChatText,
      });

      // Replace the entire completions resource with a facade
      const facade = CreateFacade.wrap(chatCompletions, proxy);
      if (openaiClient.chat) {
        openaiClient.chat.completions = facade as typeof chatCompletions;
      }
      patchedAny = true;
    } else {
      patchedAny = true;
    }
  }

  if (!patchedAny) {
    throw new Error('OpenAI client has no .responses.create or .chat.completions.create method.');
  }
}
