import { Message, LLMRequest, Usage, LLMResponse } from '../../types/index.js';
import { AnthropicMessage } from './types.js';
import { AnthropicResponse } from './responses.js';

export function anthropicInputToMessages(input: unknown): Message[] {
  if (!Array.isArray(input)) throw new Error('Invalid Anthropic input format');

  return input.map((m: AnthropicMessage) => {
    let content = '';
    // Anthropic messages can be a string or an array of content blocks
    if (typeof m.content === 'string') {
      content = m.content;
    } else if (Array.isArray(m.content)) {
      content = m.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text)
        .join('');
    }
    return { role: m.role as Message['role'], content };
  });
}

export function messagesToAnthropicInput(request: LLMRequest): AnthropicMessage[] {
  // Filter out system messages, they'll be handled separately
  return request.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

export function contentFromAnthropic(response: unknown): string {
  const r = response as AnthropicResponse;
  if (Array.isArray(r.content)) {
    return r.content
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text)
      .join('');
  }
  return '';
}

export function usageFromAnthropic(response: unknown): Usage | undefined {
  const r = response as AnthropicResponse;
  if (!r.usage) return undefined;

  return {
    promptTokens: r.usage.input_tokens,
    completionTokens: r.usage.output_tokens,
    totalTokens: r.usage.input_tokens + r.usage.output_tokens,
  };
}

export function applyContentToResponse(raw: unknown, canonical: LLMResponse): void {
  const r = raw as AnthropicResponse;

  // Best-effort mutation: overwrite the first text block and remove others to maintain consistency
  if (Array.isArray(r.content) && r.content.length > 0 && r.content[0].type === 'text') {
    r.content[0].text = canonical.content;
    if (r.content.length > 1) {
      r.content.splice(1);
    }
  } else if (Array.isArray(r.content) && r.content.length === 0) {
    r.content.push({ type: 'text', text: canonical.content });
  }
}
