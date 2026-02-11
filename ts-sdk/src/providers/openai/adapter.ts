/**
 * OpenAI Provider - Direct Adapters
 * 
 * These adapters allow using OpenAI clients directly with Axon without
 * registering them globally. Useful for:
 * - Testing
 * - Using multiple different clients
 * - More explicit control over which client is used
 * 
 * @module providers/openai/adapter
 */

import type { CallContext } from '@/types/context.js';
import type { LLMRequest } from '@/types/request.js';
import type { LLMResponse } from '@/types/response.js';
import type { OpenAIClient, OpenAIResponsesCreateArgs, OpenAIChatCompletionsCreateArgs } from './types.js';
import { isOpenAIResponsesClient, isOpenAIChatClient } from './types.js';
import {
  messagesToOpenAIInput,
  contentFromOpenAI,
  usageFromOpenAI,
} from './common.js';

/**
 * Build arguments for OpenAI responses.create() call
 * 
 * @param request - Canonical LLM request
 * @param defaultModel - Fallback model if request.model is undefined
 * @returns Arguments object for responses.create()
 * @throws {Error} If no model is provided
 */
function buildResponsesArgs(
  request: LLMRequest,
  defaultModel?: string
): OpenAIResponsesCreateArgs {
  const model = request.model ?? defaultModel;
  if (!model) {
    throw new Error('No model provided (set request.model or provide defaultModel option).');
  }

  // Extract params, excluding model and input which we set explicitly
  const params = { ...(request.params ?? {}) };
  delete params.model;
  delete params.input;

  return {
    model,
    input: messagesToOpenAIInput(request),
    ...params,
  };
}

/**
 * Build arguments for OpenAI chat.completions.create() call
 * 
 * @param request - Canonical LLM request
 * @param defaultModel - Fallback model if request.model is undefined
 * @returns Arguments object for chat.completions.create()
 * @throws {Error} If no model is provided
 */
function buildChatArgs(
  request: LLMRequest,
  defaultModel?: string
): OpenAIChatCompletionsCreateArgs {
  const model = request.model ?? defaultModel;
  if (!model) {
    throw new Error('No model provided (set request.model or provide defaultModel option).');
  }

  // Extract params, excluding model and messages which we set explicitly
  const params = { ...(request.params ?? {}) };
  delete params.model;
  delete params.messages;

  return {
    model,
    messages: messagesToOpenAIInput(request),
    ...params,
  };
}

/**
 * Adapter for OpenAI Responses API
 * 
 * Wraps an OpenAI client's responses.create() method to work with
 * Axon's canonical request/response types.
 * 
 * @example
 * ```typescript
 * import { OpenAI } from 'openai';
 * import { Axon } from '@memori/axon';
 * import { OpenAIResponsesAdapter } from '@memori/axon/providers/openai';
 * 
 * const client = new OpenAI();
 * const adapter = new OpenAIResponsesAdapter(client, {
 *   defaultModel: 'gpt-4'
 * });
 * 
 * const axon = new Axon({ adapter, tasks: [...] });
 * 
 * const response = await axon.call({
 *   messages: [{role: 'user', content: 'Hello'}]
 * });
 * ```
 */
export class OpenAIResponsesAdapter {
  private readonly client: OpenAIClient;
  private readonly defaultModel?: string;

  /**
   * Create a new OpenAI Responses adapter
   * 
   * @param client - OpenAI client instance with responses API
   * @param opts - Optional configuration
   * @param opts.defaultModel - Model to use if not specified in request
   * @throws {Error} If client doesn't have responses API
   */
  constructor(client: unknown, opts?: { defaultModel?: string }) {
    if (!isOpenAIResponsesClient(client)) {
      throw new Error(
        'Client does not have responses API. ' +
        'Make sure the client has a responses.create() method.'
      );
    }
    this.client = client as OpenAIClient;
    this.defaultModel = opts?.defaultModel;
  }

  /**
   * Execute an LLM call using the responses API
   * 
   * @param request - Canonical LLM request
   * @param _ctx - Call context (unused but required by interface)
   * @returns Canonical LLM response with content, usage, and raw response
   */
  async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
    if (!this.client.responses) {
      throw new Error('Client responses API is undefined');
    }

    const args = buildResponsesArgs(request, this.defaultModel);
    const raw = await this.client.responses.create(args);

    return {
      content: contentFromOpenAI(raw),
      usage: usageFromOpenAI(raw),
      raw,
    };
  }
}

/**
 * Adapter for OpenAI Chat Completions API
 * 
 * Wraps an OpenAI client's chat.completions.create() method to work with
 * Axon's canonical request/response types.
 * 
 * @example
 * ```typescript
 * import { OpenAI } from 'openai';
 * import { Axon } from '@memori/axon';
 * import { OpenAIChatCompletionsAdapter } from '@memori/axon/providers/openai';
 * 
 * const client = new OpenAI();
 * const adapter = new OpenAIChatCompletionsAdapter(client, {
 *   defaultModel: 'gpt-4'
 * });
 * 
 * const axon = new Axon({ adapter, tasks: [...] });
 * 
 * const response = await axon.call({
 *   messages: [{role: 'user', content: 'Hello'}]
 * });
 * ```
 */
export class OpenAIChatCompletionsAdapter {
  private readonly client: OpenAIClient;
  private readonly defaultModel?: string;

  /**
   * Create a new OpenAI Chat Completions adapter
   * 
   * @param client - OpenAI client instance with chat.completions API
   * @param opts - Optional configuration
   * @param opts.defaultModel - Model to use if not specified in request
   * @throws {Error} If client doesn't have chat.completions API
   */
  constructor(client: unknown, opts?: { defaultModel?: string }) {
    if (!isOpenAIChatClient(client)) {
      throw new Error(
        'Client does not have chat.completions API. ' +
        'Make sure the client has a chat.completions.create() method.'
      );
    }
    this.client = client as OpenAIClient;
    this.defaultModel = opts?.defaultModel;
  }

  /**
   * Execute an LLM call using the chat completions API
   * 
   * @param request - Canonical LLM request
   * @param _ctx - Call context (unused but required by interface)
   * @returns Canonical LLM response with content, usage, and raw response
   */
  async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
    if (!this.client.chat?.completions) {
      throw new Error('Client chat.completions API is undefined');
    }

    const args = buildChatArgs(request, this.defaultModel);
    const raw = await this.client.chat.completions.create(args);

    return {
      content: contentFromOpenAI(raw),
      usage: usageFromOpenAI(raw),
      raw,
    };
  }
}