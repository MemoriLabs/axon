import { Message, LLMRequest, Usage, LLMResponse } from '../../types/index.js';
import { hasUsage } from './responses.js';

export function openaiInputToMessages(input: unknown): Message[] {
  if (typeof input === 'string') return [{ role: 'user', content: input }];
  if (Array.isArray(input)) return input as Message[];
  throw new Error('Invalid OpenAI input format');
}

export function messagesToOpenAIInput(request: LLMRequest): any[] {
  return request.messages.map((m) => ({ role: m.role, content: m.content }));
}

export function contentFromOpenAI(response: unknown): string {
  const r = response as any;
  if (r.output_text) return r.output_text;
  if (r.choices?.[0]?.message?.content) return r.choices[0].message.content;
  return '';
}

export function usageFromOpenAI(response: unknown): Usage | undefined {
  if (!hasUsage(response)) return undefined;
  const u = response.usage;
  return {
    promptTokens: u.prompt_tokens ?? u.input_tokens,
    completionTokens: u.completion_tokens ?? u.output_tokens,
    totalTokens: u.total_tokens,
  };
}

/**
 * Apply canonical response changes back to OpenAI text response
 */
export function applyContentToTextResponse(raw: unknown, canonical: LLMResponse): void {
  // We extract the content string from the canonical response here
  if ((raw as any).output_text !== undefined) {
    (raw as any).output_text = canonical.content;
  }
}

/**
 * Apply canonical response changes back to OpenAI chat completion
 */
export function applyContentToChatResponse(raw: unknown, canonical: LLMResponse): void {
  // We extract the content string from the canonical response here
  if ((raw as any).choices?.[0]?.message) {
    (raw as any).choices[0].message.content = canonical.content;
  }
}
