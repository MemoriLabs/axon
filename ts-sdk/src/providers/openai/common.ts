import { Message, LLMRequest, Usage, LLMResponse } from '../../types/index.js';
import { hasUsage, OpenAIChatCompletionResponse, OpenAITextResponse } from './responses.js';

type AnyOpenAIResponse = OpenAIChatCompletionResponse | OpenAITextResponse;

export function openaiInputToMessages(input: unknown): Message[] {
  if (typeof input === 'string') return [{ role: 'user', content: input }];
  if (Array.isArray(input)) return input as Message[];
  throw new Error('Invalid OpenAI input format');
}

export function messagesToOpenAIInput(request: LLMRequest): { role: string; content: string }[] {
  return request.messages.map((m) => ({ role: m.role, content: m.content }));
}

export function contentFromOpenAI(response: unknown): string {
  const r = response as AnyOpenAIResponse;
  if ('output_text' in r) return r.output_text;
  if ('choices' in r && r.choices[0]?.message?.content) return r.choices[0].message.content;
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

export function applyContentToTextResponse(raw: unknown, canonical: LLMResponse): void {
  const r = raw as OpenAITextResponse;
  if ('output_text' in r) {
    r.output_text = canonical.content;
  }
}

export function applyContentToChatResponse(raw: unknown, canonical: LLMResponse): void {
  const r = raw as OpenAIChatCompletionResponse;
  if (r.choices[0]?.message) {
    r.choices[0].message.content = canonical.content;
  }
}
