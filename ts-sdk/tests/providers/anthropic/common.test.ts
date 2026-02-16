import { describe, it, expect } from 'vitest';
import {
  anthropicInputToMessages,
  messagesToAnthropicInput,
  contentFromAnthropic,
  usageFromAnthropic,
  applyContentToResponse,
} from '@/providers/anthropic/common.js';
import { LLMRequest, LLMResponse } from '@/types/index.js';

describe('Anthropic Common Utilities', () => {
  describe('anthropicInputToMessages', () => {
    it('should convert text content blocks to string', () => {
      const input = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'hello' }],
        },
      ];
      const result = anthropicInputToMessages(input);
      expect(result).toEqual([{ role: 'user', content: 'hello' }]);
    });

    it('should handle simple string content', () => {
      const input = [{ role: 'user', content: 'hello' }];
      const result = anthropicInputToMessages(input);
      expect(result).toEqual([{ role: 'user', content: 'hello' }]);
    });
  });

  describe('messagesToAnthropicInput', () => {
    it('should map LLMRequest messages to Anthropic format', () => {
      const req: LLMRequest = {
        messages: [{ role: 'user', content: 'hi' }],
      };
      const result = messagesToAnthropicInput(req);
      expect(result).toEqual([{ role: 'user', content: 'hi' }]);
    });
  });

  describe('contentFromAnthropic', () => {
    it('should join text blocks', () => {
      const response = {
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world' },
        ],
      };
      expect(contentFromAnthropic(response)).toBe('Hello world');
    });

    it('should return empty string for empty content', () => {
      expect(contentFromAnthropic({ content: [] })).toBe('');
    });
  });

  describe('usageFromAnthropic', () => {
    it('should map input/output tokens', () => {
      const response = {
        usage: { input_tokens: 10, output_tokens: 20 },
      };
      expect(usageFromAnthropic(response)).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });
  });

  describe('applyContentToResponse', () => {
    it('should mutate the first text block', () => {
      const raw = {
        content: [{ type: 'text', text: 'old' }],
      };
      const canonical: LLMResponse = { content: 'new' };

      applyContentToResponse(raw, canonical);
      expect(raw.content[0].text).toBe('new');
    });

    it('should push new block if array is empty', () => {
      const raw = { content: [] };
      applyContentToResponse(raw, { content: 'new' } as any);
      expect(raw.content[0]).toEqual({ type: 'text', text: 'new' });
    });
  });
});
