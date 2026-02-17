import type { Axon } from '../../core/axon.js';
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
import { OpenAIChatCompletionResponse, OpenAITextResponse } from './responses.js';
import { patchMethod } from '../patcher.js';

function extractParams(
  args: Record<string, unknown>,
  inputKey: 'input' | 'messages'
): Record<string, unknown> {
  const { model: _model, [inputKey]: _input, ...params } = args;
  return params;
}

function responsesArgsToRequest(args: OpenAIResponsesCreateArgs): LLMRequest {
  return {
    messages: openaiInputToMessages(args.input),
    model: args.model,
    params: extractParams(args as Record<string, unknown>, 'input'),
  };
}

function requestToResponsesArgs(request: LLMRequest): OpenAIResponsesCreateArgs {
  if (!request.model) throw new Error('No model provided.');
  return {
    model: request.model,
    input: messagesToOpenAIInput(request),
    ...(request.params ?? {}),
  } as OpenAIResponsesCreateArgs;
}

function chatArgsToRequest(args: OpenAIChatCompletionsCreateArgs): LLMRequest {
  return {
    messages: openaiInputToMessages(args.messages),
    model: args.model,
    params: extractParams(args as Record<string, unknown>, 'messages'),
  };
}

function requestToChatArgs(request: LLMRequest): OpenAIChatCompletionsCreateArgs {
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

function chunkToText(chunk: unknown): string | undefined {
  const chatChunk = chunk as OpenAIChatCompletionResponse;
  const content = chatChunk.choices[0]?.delta?.content;
  if (typeof content === 'string') return content;

  const textChunk = chunk as OpenAITextResponse;
  if (typeof textChunk.output_text === 'string') return textChunk.output_text;

  return undefined;
}

export function patchOpenAIClient(client: unknown, axon: Axon): void {
  const openaiClient = client as OpenAIClient;
  let patchedAny = false;

  // Patch Legacy Responses API
  if (openaiClient.responses) {
    if (
      patchMethod({
        axon,
        parent: openaiClient.responses,
        methodName: 'create',
        ctxMetadata: { provider: 'openai', method: 'responses.create' },
        argsToRequest: responsesArgsToRequest,
        requestToArgs: requestToResponsesArgs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyContentToTextResponse,
      })
    ) {
      patchedAny = true;
    }
  }

  // Patch Chat Completions API
  if (openaiClient.chat?.completions) {
    if (
      patchMethod({
        axon,
        parent: openaiClient.chat.completions,
        methodName: 'create',
        ctxMetadata: { provider: 'openai', method: 'chat.completions.create' },
        argsToRequest: chatArgsToRequest,
        requestToArgs: requestToChatArgs,
        rawToResponse: rawToCanonical,
        applyCanonicalToRaw: applyContentToChatResponse,
        chunkToText,
      })
    ) {
      patchedAny = true;
    }
  }

  if (!patchedAny && !isOpenAIClient(client)) {
    throw new Error('OpenAI client has no patchable APIs.');
  }
}
