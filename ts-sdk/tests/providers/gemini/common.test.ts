import { describe, it, expect } from 'vitest';
import {
  geminiInputToMessages,
  messagesToGeminiInput,
  contentFromGemini,
  usageFromGemini,
  applyContentToGeminiResponse,
} from '@/providers/gemini/common.js';
import { LLMRequest, LLMResponse } from '@/types/index.js';

describe('Gemini Common Utilities', () => {
  describe('geminiInputToMessages', () => {
    it('should convert string input to user message', () => {
      const result = geminiInputToMessages('hello');
      expect(result).toEqual([{ role: 'user', content: 'hello' }]);
    });

    it('should convert array of parts to messages and map roles', () => {
      const input = [
        { role: 'user', parts: [{ text: 'hi' }] },
        { role: 'model', parts: [{ text: 'hello there' }, { text: '!' }] },
      ];
      const result = geminiInputToMessages(input);
      expect(result).toEqual([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello there!' },
      ]);
    });

    it('should return empty array for invalid/empty input', () => {
      expect(geminiInputToMessages({} as any)).toEqual([]);
    });
  });

  describe('messagesToGeminiInput', () => {
    it('should map LLMRequest messages to Gemini format', () => {
      const req: LLMRequest = {
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'yo' },
        ],
        model: 'gemini-1.5-flash',
      };
      const result = messagesToGeminiInput(req);
      expect(result).toEqual([
        { role: 'user', parts: [{ text: 'hi' }] },
        { role: 'model', parts: [{ text: 'yo' }] },
      ]);
    });
  });

  describe('contentFromGemini', () => {
    it('should extract content from top-level text property', () => {
      const response = { text: 'top level text' };
      expect(contentFromGemini(response)).toBe('top level text');
    });

    it('should extract content from nested candidates array', () => {
      const response = {
        candidates: [{ content: { parts: [{ text: 'nested text' }] } }],
      };
      expect(contentFromGemini(response)).toBe('nested text');
    });

    it('should return empty string if structure is invalid', () => {
      expect(contentFromGemini({})).toBe('');
    });
  });

  describe('usageFromGemini', () => {
    it('should map usage metadata correctly', () => {
      const response = {
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };
      expect(usageFromGemini(response)).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it('should return undefined if no usageMetadata present', () => {
      expect(usageFromGemini({})).toBeUndefined();
    });
  });

  describe('applyContentToGeminiResponse', () => {
    it('should mutate candidates structure', () => {
      const raw = {
        candidates: [{ content: { parts: [{ text: 'old' }] } }],
      };
      applyContentToGeminiResponse(raw, { content: 'new' } as LLMResponse);
      expect(raw.candidates[0].content.parts[0].text).toBe('new');
    });

    it('should mutate top-level text property', () => {
      const raw = { text: 'old' };
      applyContentToGeminiResponse(raw, { content: 'new' } as LLMResponse);
      expect(raw.text).toBe('new');
    });
  });
});
