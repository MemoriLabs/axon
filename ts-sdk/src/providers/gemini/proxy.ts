import type { Axon } from '../../core/axon.js';
import type { GeminiClient, GeminiGenerateContentArgs } from './types.js';
import { LLMRequest, LLMResponse } from '../../types/index.js';
import { patchMethod } from '../patcher.js';
import {
  geminiInputToMessages,
  messagesToGeminiInput,
  contentFromGemini,
  usageFromGemini,
  applyContentToGeminiResponse,
} from './common.js';
import { extractSDKVersion } from '../telemetry.js';
import { GeminiResponse } from './responses.js';
import { PROVIDERS } from '../../utils/constants.js';

function argsToRequest(args: GeminiGenerateContentArgs): LLMRequest {
  const { model: _model, contents: _contents, ...params } = args;
  return {
    messages: geminiInputToMessages(args.contents),
    model: args.model,
    params,
  };
}

function requestToArgs(request: LLMRequest): GeminiGenerateContentArgs {
  if (!request.model) throw new Error('No model provided.');
  return {
    model: request.model,
    contents: messagesToGeminiInput(request),
    ...(request.params ?? {}),
  } as GeminiGenerateContentArgs;
}

function rawToCanonical(raw: unknown): LLMResponse {
  return { content: contentFromGemini(raw), usage: usageFromGemini(raw), raw };
}

function chunkToText(chunk: unknown): string | undefined {
  const r = chunk as GeminiResponse;

  if (typeof r.text === 'string') return r.text;

  return r.candidates?.[0]?.content?.parts?.[0]?.text;
}

export function patchGeminiClient(client: unknown, axon: Axon): void {
  const geminiClient = client as GeminiClient;
  const sdkVersion = extractSDKVersion(geminiClient);

  if (!geminiClient.models) {
    throw new Error('Gemini client has no models API.');
  }

  // Patch the standard (unary) method
  patchMethod({
    axon,
    parent: geminiClient.models,
    methodName: 'generateContent',
    ctxMetadata: { provider: PROVIDERS.GEMINI.id, method: 'models.generateContent', sdkVersion },
    argsToRequest,
    requestToArgs,
    rawToResponse: rawToCanonical,
    applyCanonicalToRaw: applyContentToGeminiResponse,
    chunkToText,
  });

  // Patch the explicit streaming method
  patchMethod({
    axon,
    parent: geminiClient.models,
    methodName: 'generateContentStream',
    ctxMetadata: {
      provider: PROVIDERS.GEMINI.id,
      method: 'models.generateContentStream',
      sdkVersion,
    },
    argsToRequest: (args) => {
      const baseRequest = argsToRequest(args);
      return {
        ...baseRequest,
        params: { ...baseRequest.params, stream: true },
      };
    },
    requestToArgs,
    rawToResponse: rawToCanonical,
    applyCanonicalToRaw: applyContentToGeminiResponse,
    chunkToText,
  });
}
