import { Message, LLMRequest, Usage, LLMResponse } from '../../types/index.js';
import { GeminiGenerateContentArgs } from './types.js';
import { GeminiResponse } from './responses.js';

export function geminiInputToMessages(contents: GeminiGenerateContentArgs['contents']): Message[] {
  if (typeof contents === 'string') return [{ role: 'user', content: contents }];
  if (Array.isArray(contents)) {
    return contents.map((c) => ({
      role: (c.role === 'model' ? 'assistant' : 'user') as Message['role'],
      content: c.parts.map((p) => p.text).join(''),
    }));
  }
  return [];
}

export function messagesToGeminiInput(request: LLMRequest): GeminiGenerateContentArgs['contents'] {
  return request.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));
}

export function contentFromGemini(response: unknown): string {
  const r = response as GeminiResponse;
  if (r.text) return r.text;
  if (r.candidates?.[0]?.content?.parts?.[0]?.text) {
    return r.candidates[0].content.parts[0].text;
  }
  return '';
}

export function usageFromGemini(response: unknown): Usage | undefined {
  const r = response as GeminiResponse;
  if (!r.usageMetadata) return undefined;

  return {
    promptTokens: r.usageMetadata.promptTokenCount,
    completionTokens: r.usageMetadata.candidatesTokenCount,
    totalTokens: r.usageMetadata.totalTokenCount,
  };
}

export function applyContentToGeminiResponse(raw: unknown, canonical: LLMResponse): void {
  const r = raw as GeminiResponse;
  if (r.candidates?.[0]?.content?.parts?.[0]) {
    r.candidates[0].content.parts[0].text = canonical.content;
  } else if (r.text !== undefined) {
    r.text = canonical.content;
  }
}
