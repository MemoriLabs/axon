import { describe, it, expect } from 'vitest';
import {
  openaiInputToMessages,
  messagesToOpenAIInput,
  contentFromOpenAI,
  usageFromOpenAI,
  applyContentToTextResponse,
  applyContentToChatResponse,
} from '@/providers/openai/common.js';
import { LLMRequest, LLMResponse } from '@/types/index.js';

describe('OpenAI Common Utilities', () => {
  describe('openaiInputToMessages', () => {
    it('should convert string input to user message', () => {
      const result = openaiInputToMessages('hello');
      expect(result).toEqual([{ role: 'user', content: 'hello' }]);
    });

    it('should pass through array input', () => {
      const input = [{ role: 'system', content: 'hi' }];
      const result = openaiInputToMessages(input);
      expect(result).toBe(input);
    });

    it('should throw on invalid input', () => {
      expect(() => openaiInputToMessages(123)).toThrow();
    });
  });

  describe('messagesToOpenAIInput', () => {
    it('should map LLMRequest messages to OpenAI format', () => {
      const req: LLMRequest = {
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'yo' },
        ],
        model: 'gpt-4',
      };
      const result = messagesToOpenAIInput(req);
      expect(result).toEqual([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'yo' },
      ]);
    });
  });

  describe('contentFromOpenAI', () => {
    it('should extract content from chat completion choice', () => {
      const response = {
        choices: [{ message: { content: 'response text' } }],
      };
      expect(contentFromOpenAI(response)).toBe('response text');
    });

    it('should extract content from text completion (legacy)', () => {
      const response = { output_text: 'legacy text' };
      expect(contentFromOpenAI(response)).toBe('legacy text');
    });

    it('should return empty string if structure matches nothing', () => {
      expect(contentFromOpenAI({})).toBe('');
    });
  });

  describe('usageFromOpenAI', () => {
    it('should extract usage stats', () => {
      const response = {
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };
      expect(usageFromOpenAI(response)).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it('should return undefined if no usage present', () => {
      expect(usageFromOpenAI({})).toBeUndefined();
    });
  });

  describe('applyContentToChatResponse', () => {
    it('should mutate the raw response with new content', () => {
      const raw = {
        choices: [{ message: { content: 'old' } }],
      };
      const canonical: LLMResponse = { content: 'new' };

      applyContentToChatResponse(raw, canonical);
      expect(raw.choices[0].message.content).toBe('new');
    });
  });

  describe('applyContentToTextResponse', () => {
    it('should mutate text response with new content', () => {
      const rawResponse = { output_text: 'original', usage: {} };
      const canonicalResponse: LLMResponse = { content: 'modified' };

      applyContentToTextResponse(rawResponse, canonicalResponse);

      expect(rawResponse.output_text).toBe('modified');
    });

    it('should ignore if output_text property does not exist', () => {
      const rawResponse = { other_field: 'original' };
      const canonicalResponse: LLMResponse = { content: 'modified' };

      // Should not throw
      applyContentToTextResponse(rawResponse, canonicalResponse);
      expect((rawResponse as any).output_text).toBeUndefined();
    });
  });
});
