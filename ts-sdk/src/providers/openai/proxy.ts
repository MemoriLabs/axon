/**
 * OpenAI Provider - Client Patching
 * 
 * This file contains the logic for intercepting OpenAI client method calls
 * and running Axon hooks around them. It patches the client in-place using
 * a facade pattern that preserves the original API surface.
 * 
 * @module providers/openai/proxy
 */

import type { Axon } from '@/core/axon.js';
import type { LLMRequest } from '@/types/request.js';
import type { LLMResponse } from '@/types/response.js';
import { HookedCreateProxy, CreateFacade } from '@/hooks/hooked.js';
import type { OpenAIChatCompletionsCreateArgs, OpenAIClient, OpenAIResponsesCreateArgs } from './types.js';
import {
  openaiInputToMessages,
  messagesToOpenAIInput,
  contentFromOpenAI,
  usageFromOpenAI,
  applyContentToTextResponse,
  applyContentToChatResponse,
} from './common.js';

/**
 * Convert responses.create() kwargs to canonical LLMRequest
 */
function responsesKwargsToRequest(kwargs: Record<string, unknown>): LLMRequest {
  const model = kwargs.model as string | undefined;
  const input = kwargs.input;

  // Remove model and input from params
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
function requestToResponsesKwargs(request: LLMRequest): Record<string, unknown> {
  if (!request.model) {
    throw new Error(
      'No model provided (set model in the OpenAI call or via a before_call hook).'
    );
  }

  return {
    model: request.model,
    input: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  };
}

/**
 * Convert chat.completions.create() kwargs to canonical LLMRequest
 */
function chatKwargsToRequest(kwargs: Record<string, unknown>): LLMRequest {
  const model = kwargs.model as string | undefined;
  const messages = kwargs.messages;

  // Remove model and messages from params
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
function requestToChatKwargs(request: LLMRequest): Record<string, unknown> {
  if (!request.model) {
    throw new Error(
      'No model provided (set model in the OpenAI call or via a before_call hook).'
    );
  }

  return {
    model: request.model,
    messages: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  };
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
 * 
 * This function modifies the client in-place, wrapping its create() methods
 * with Axon's hook system. It uses a facade pattern to avoid mutating the
 * original client object directly.
 * 
 * @param client - OpenAI client instance (type unknown from registry)
 * @param axon - Axon instance to run hooks with
 * @throws {Error} If client has no patchable APIs
 * 
 * @internal
 * This function is called by the provider registry system
 */
export function patchOpenAIClient(client: unknown, axon: Axon): void {
  const openaiClient = client as OpenAIClient;
  let patchedAny = false;

  // Patch responses API if available
  if (openaiClient.responses && typeof openaiClient.responses.create === 'function') {
    if (!openaiClient.responses.__axon_patched__) {
      patchedAny = true;
      
      const originalCreate = openaiClient.responses.create.bind(openaiClient.responses);

      // Wrap to match HookedCreateProxy signature
      const wrappedCreate = async (input: unknown): Promise<unknown> => {
        return await originalCreate(input as OpenAIResponsesCreateArgs);
      };

      const proxy = new HookedCreateProxy({
        create: wrappedCreate,
        axon,
        ctxMetadata: { provider: 'openai', method: 'responses.create' },
        kwargsToRequest: responsesKwargsToRequest,
        requestToKwargs: requestToResponsesKwargs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyTextChanges,
      });

      const facade = CreateFacade.wrap(openaiClient.responses, proxy);
      openaiClient.responses = facade as typeof openaiClient.responses;
    } else {
      patchedAny = true; // Already patched
    }
  }

  // Patch chat.completions API if available
  const chatCompletions = openaiClient.chat?.completions;
  if (chatCompletions && typeof chatCompletions.create === 'function') {
    if (!chatCompletions.__axon_patched__) {
      patchedAny = true;
      
      const originalCreate = chatCompletions.create.bind(chatCompletions);

      // Wrap to match HookedCreateProxy signature
      const wrappedCreate = async (input: unknown): Promise<unknown> => {
        return await originalCreate(input as OpenAIChatCompletionsCreateArgs);
      };

      const proxy = new HookedCreateProxy({
        create: wrappedCreate,
        axon,
        ctxMetadata: { provider: 'openai', method: 'chat.completions.create' },
        kwargsToRequest: chatKwargsToRequest,
        requestToKwargs: requestToChatKwargs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyChatChanges,
      });

      const facade = CreateFacade.wrap(chatCompletions, proxy);
      if (openaiClient.chat) {
        openaiClient.chat.completions = facade as typeof chatCompletions;
      }
    } else {
      patchedAny = true; // Already patched
    }
  }

  if (!patchedAny) {
    throw new Error(
      'OpenAI client has no patchable APIs. ' +
      'Expected either responses.create() or chat.completions.create() method.'
    );
  }
}