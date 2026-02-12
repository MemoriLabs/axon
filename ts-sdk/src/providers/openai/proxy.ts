import type { Axon } from '../../core/axon.js';
import { HookedCreateProxy, CreateFacade } from '../../hooks/hooked.js';
import type { 
  OpenAIChatCompletionsCreateArgs, 
  OpenAIClient, 
  OpenAIResponsesCreateArgs 
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

/**
 * Convert responses.create() kwargs to canonical LLMRequest
 */
function responsesKwargsToRequest(kwargs: OpenAIResponsesCreateArgs): LLMRequest {
  const model = kwargs.model;
  const input = kwargs.input;

  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.input;

  return {
    messages: openaiInputToMessages(input),
    model,
    params,
  };
}

/**
 * Convert canonical LLMRequest to responses.create() kwargs
 */
function requestToResponsesKwargs(request: LLMRequest): OpenAIResponsesCreateArgs {
  if (!request.model) {
    throw new Error(
      'No model provided (set model in the OpenAI call or via a before_call hook).'
    );
  }

  return {
    model: request.model,
    input: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  } as OpenAIResponsesCreateArgs;
}

/**
 * Convert chat.completions.create() kwargs to canonical LLMRequest
 */
function chatKwargsToRequest(kwargs: OpenAIChatCompletionsCreateArgs): LLMRequest {
  const model = kwargs.model;
  const messages = kwargs.messages;

  const params: Record<string, unknown> = { ...kwargs };
  delete params.model;
  delete params.messages;

  return {
    messages: openaiInputToMessages(messages),
    model,
    params,
  };
}

/**
 * Convert canonical LLMRequest to chat.completions.create() kwargs
 */
function requestToChatKwargs(request: LLMRequest): OpenAIChatCompletionsCreateArgs {
  if (!request.model) {
    throw new Error(
      'No model provided (set model in the OpenAI call or via a before_call hook).'
    );
  }

  return {
    model: request.model,
    messages: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  } as OpenAIChatCompletionsCreateArgs;
}

/**
 * Convert any OpenAI raw response to canonical LLMResponse
 */
function rawToCanonical(raw: unknown): LLMResponse {
  return {
    content: contentFromOpenAI(raw),
    usage: usageFromOpenAI(raw),
    raw,
  };
}

/**
 * Apply canonical content changes back to text response format
 */
function applyTextChanges(raw: unknown, canonical: LLMResponse): void {
  applyContentToTextResponse(raw, canonical.content);
}

/**
 * Apply canonical content changes back to chat response format
 */
function applyChatChanges(raw: unknown, canonical: LLMResponse): void {
  applyContentToChatResponse(raw, canonical.content);
}

/**
 * Patch an OpenAI client to intercept API calls with Axon hooks
 */
export function patchOpenAIClient(client: unknown, axon: Axon): void {
  const openaiClient = client as OpenAIClient;
  let patchedAny = false;

  // Patch responses API if available
  if (openaiClient.responses && typeof openaiClient.responses.create === 'function') {
    if (!openaiClient.responses.__axon_patched__) {
      patchedAny = true;
      
      const proxy = new HookedCreateProxy<OpenAIResponsesCreateArgs, any>({
        create: openaiClient.responses.create.bind(openaiClient.responses),
        axon,
        ctxMetadata: { provider: 'openai', method: 'responses.create' },
        kwargsToRequest: responsesKwargsToRequest,
        requestToKwargs: requestToResponsesKwargs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyTextChanges,
      });

      openaiClient.responses = CreateFacade.wrap(openaiClient.responses, proxy) as any;
    } else {
      patchedAny = true;
    }
  }

  // Patch chat.completions API if available
  const chatCompletions = openaiClient.chat?.completions;
  if (chatCompletions && typeof chatCompletions.create === 'function') {
    if (!chatCompletions.__axon_patched__) {
      patchedAny = true;
      
      const proxy = new HookedCreateProxy<OpenAIChatCompletionsCreateArgs, any>({
        create: chatCompletions.create.bind(chatCompletions),
        axon,
        ctxMetadata: { provider: 'openai', method: 'chat.completions.create' },
        kwargsToRequest: chatKwargsToRequest,
        requestToKwargs: requestToChatKwargs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyChatChanges,
      });

      if (openaiClient.chat) {
        openaiClient.chat.completions = CreateFacade.wrap(chatCompletions, proxy) as any;
      }
    } else {
      patchedAny = true;
    }
  }

  if (!patchedAny) {
    throw new Error(
      'OpenAI client has no patchable APIs. ' +
      'Expected either responses.create() or chat.completions.create() method.'
    );
  }
}