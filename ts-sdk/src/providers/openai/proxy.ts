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
import { OpenAIChatCompletionResponse, OpenAITextResponse } from './responses.js';

const patchedObjects = new WeakSet();

// --- Helper: Clean Params ---
// Extract 'model' and the input field, leaving only extra params
function extractParams(
  args: Record<string, unknown>,
  inputKey: 'input' | 'messages'
): Record<string, unknown> {
  const { model: _model, [inputKey]: _input, ...params } = args;
  return params;
}

// --- Converters ---
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
  // Safe check: explicitly check for 'string' type to allow empty strings ""
  const chatChunk = chunk as OpenAIChatCompletionResponse;
  const content = chatChunk.choices[0]?.delta?.content;
  if (typeof content === 'string') return content;

  const textChunk = chunk as OpenAITextResponse;
  if (typeof textChunk.output_text === 'string') return textChunk.output_text;

  return undefined;
}

// --- Patcher ---
export function patchOpenAIClient(client: unknown, axon: Axon): void {
  const openaiClient = client as OpenAIClient;
  let patchedAny = false;

  const patchResource = <TArgs>(
    resource: unknown,
    ctxMethod: string,
    argsToReq: (a: TArgs) => LLMRequest,
    reqToArgs: (r: LLMRequest) => TArgs,
    applyToRaw: (raw: unknown, c: LLMResponse) => void
  ): boolean => {
    if (!resource || typeof resource !== 'object') return false;

    // Treat the parent as a dictionary so we can swap the 'create' property safely
    const parent = resource as Record<string, unknown>;
    const originalMethod = parent.create;

    if (typeof originalMethod !== 'function') return false;
    if (patchedObjects.has(originalMethod)) return false;

    const proxy = new HookedCreateProxy<TArgs, unknown>({
      // Ensure the original method is bound to the correct 'this' (the parent object)
      create: (originalMethod as (args: TArgs) => Promise<unknown>).bind(parent),
      axon,
      ctxMetadata: { provider: 'openai', method: ctxMethod },
      argsToRequest: argsToReq,
      requestToArgs: reqToArgs,
      rawToResponse: rawToCanonical,
      applyCanonicalToRaw: applyToRaw,
      chunkToText,
    });

    // Wrap the function directly using standard function wrapping instead of Proxying the object
    const wrapped = CreateFacade.wrap(originalMethod as (input: TArgs) => Promise<unknown>, proxy);

    // Re-assign back to the parent object
    parent.create = wrapped;
    patchedObjects.add(wrapped as object);

    return true;
  };

  // Patch Responses API
  if (openaiClient.responses) {
    if (
      patchResource(
        openaiClient.responses,
        'responses.create',
        responsesArgsToRequest,
        requestToResponsesArgs,
        applyContentToTextResponse
      )
    ) {
      patchedAny = true;
    }
  }

  // Patch Chat Completions API
  if (openaiClient.chat?.completions) {
    if (
      patchResource(
        openaiClient.chat.completions,
        'chat.completions.create',
        chatArgsToRequest,
        requestToChatArgs,
        applyContentToChatResponse
      )
    ) {
      patchedAny = true;
    }
  }

  if (!patchedAny && !isOpenAIClient(client)) {
    throw new Error('OpenAI client has no patchable APIs.');
  }
}
