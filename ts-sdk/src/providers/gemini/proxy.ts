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

function extractSystemInstruction(config?: GeminiGenerateContentArgs['config']): string {
  if (!config?.systemInstruction) return '';

  const instruction = config.systemInstruction;

  if (typeof instruction === 'string') {
    return instruction;
  }

  if (typeof instruction === 'object') {
    const parts = instruction.parts;
    if (Array.isArray(parts)) {
      return parts
        .map((p) => p.text)
        .filter((text): text is string => typeof text === 'string')
        .join('');
    }
  }

  return '';
}

function argsToRequest(args: GeminiGenerateContentArgs): LLMRequest {
  const { model: _model, contents: _contents, ...params } = args;
  const messages = geminiInputToMessages(args.contents);

  const systemContent = extractSystemInstruction(params.config);
  if (systemContent) {
    messages.unshift({ role: 'system', content: systemContent });
  }

  return {
    messages,
    model: args.model,
    params,
  };
}

function requestToArgs(request: LLMRequest): GeminiGenerateContentArgs {
  if (!request.model) throw new Error('No model provided.');

  const [systemMessages, otherMessages] = request.messages.reduce<
    [typeof request.messages, typeof request.messages]
  >(
    ([sys, other], msg) =>
      msg.role === 'system' ? [[...sys, msg], other] : [sys, [...other, msg]],
    [[], []]
  );

  const args: GeminiGenerateContentArgs = {
    model: request.model,
    contents: messagesToGeminiInput({ ...request, messages: otherMessages }),
    ...(request.params ?? {}),
  };

  if (systemMessages.length > 0) {
    args.config = {
      ...(args.config ?? {}),
      systemInstruction: systemMessages.map((m) => m.content).join('\n\n'),
    };
  }

  return args;
}

function rawToCanonical(raw: unknown): LLMResponse {
  return { content: contentFromGemini(raw), usage: usageFromGemini(raw), raw };
}

function isGeminiResponse(raw: unknown): raw is GeminiResponse {
  return typeof raw === 'object' && raw !== null;
}

function chunkToText(chunk: unknown): string | undefined {
  if (!isGeminiResponse(chunk)) return undefined;
  if (typeof chunk.text === 'string') return chunk.text;
  return chunk.candidates?.[0]?.content?.parts?.[0]?.text;
}

export function patchGeminiClient(client: unknown, axon: Axon): void {
  const geminiClient = client as GeminiClient;
  const sdkVersion = extractSDKVersion(geminiClient);

  if (!geminiClient.models) {
    throw new Error('Gemini client has no models API.');
  }

  const sharedCtxMetadata = { provider: PROVIDERS.GEMINI.id, sdkVersion };

  const baseConfig = {
    axon,
    parent: geminiClient.models,
    requestToArgs,
    rawToResponse: rawToCanonical,
    applyCanonicalToRaw: applyContentToGeminiResponse,
    chunkToText,
  };

  patchMethod({
    ...baseConfig,
    methodName: 'generateContent',
    ctxMetadata: { ...sharedCtxMetadata, method: 'models.generateContent' },
    argsToRequest,
  });

  patchMethod({
    ...baseConfig,
    methodName: 'generateContentStream',
    ctxMetadata: { ...sharedCtxMetadata, method: 'models.generateContentStream' },
    argsToRequest: (args: GeminiGenerateContentArgs) => {
      const req = argsToRequest(args);
      return {
        ...req,
        params: { ...req.params, stream: true },
      };
    },
  });
}
