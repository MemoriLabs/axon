import type { Axon } from '../../core/axon.js';
import type { AnthropicClient, AnthropicCreateArgs } from './types.js';
import { AnthropicStreamEvent } from './responses.js';
import {
  anthropicInputToMessages,
  messagesToAnthropicInput,
  contentFromAnthropic,
  usageFromAnthropic,
  applyContentToResponse,
} from './common.js';
import { LLMRequest, LLMResponse } from '../../types/index.js';
import { patchMethod } from '../patcher.js';
import { extractSDKVersion } from '../telemetry.js';
import { PROVIDERS } from '../../utils/constants.js';

function extractParams(args: AnthropicCreateArgs): Record<string, unknown> {
  // Separate model and messages from extra provider-specific parameters
  const { model: _model, messages: _messages, system: _system, ...params } = args;
  return params;
}

function argsToRequest(args: AnthropicCreateArgs): LLMRequest {
  const messages = anthropicInputToMessages(args.messages);

  // If there's a system parameter at the top level, convert it to a system message
  if (args.system) {
    messages.unshift({ role: 'system', content: args.system });
  }

  return {
    messages,
    model: args.model,
    params: extractParams(args),
  };
}

function requestToArgs(request: LLMRequest): AnthropicCreateArgs {
  if (!request.model) throw new Error('No model provided.');

  // Extract system message if present
  const systemMessage = request.messages.find((m) => m.role === 'system');

  const args: AnthropicCreateArgs = {
    model: request.model,
    messages: messagesToAnthropicInput(request),
    ...(request.params ?? {}),
  };

  // Add system parameter at top level if system message exists
  if (systemMessage) {
    args.system = systemMessage.content;
  }

  return args;
}

function rawToCanonical(raw: unknown): LLMResponse {
  return { content: contentFromAnthropic(raw), usage: usageFromAnthropic(raw), raw };
}

function chunkToText(chunk: unknown): string | undefined {
  const event = chunk as AnthropicStreamEvent;
  // Only extract text from 'content_block_delta' events to avoid metadata noise
  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return event.delta.text;
  }
  return undefined;
}

/**
 * Injects Axon hooks into an Anthropic client instance.
 * @param client - The Anthropic client instance to patch.
 * @param axon - The Axon instance managing the hooks.
 */
export function patchAnthropicClient(client: unknown, axon: Axon): void {
  const antClient = client as AnthropicClient;
  const sdkVersion = extractSDKVersion(antClient);

  if (!(antClient as unknown as Record<string, unknown>).messages) {
    throw new Error('Anthropic client has no messages API.');
  }

  patchMethod({
    axon,
    parent: antClient.messages,
    methodName: 'create',
    ctxMetadata: { provider: PROVIDERS.ANTHROPIC.id, method: 'messages.create', sdkVersion },
    argsToRequest,
    requestToArgs,
    rawToResponse: rawToCanonical,
    applyCanonicalToRaw: applyContentToResponse,
    chunkToText,
  });
}
