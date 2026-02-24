import { describe, it, expect } from 'vitest';
import { isGeminiClient } from '@/providers/gemini/detect.js';

describe('Gemini Detection', () => {
  it('should return true for a valid Gemini client', () => {
    const mockClient = {
      models: {
        generateContent: async () => {},
      },
    };
    expect(isGeminiClient(mockClient)).toBe(true);
  });

  it('should return false for invalid objects', () => {
    expect(isGeminiClient({})).toBe(false);
    expect(isGeminiClient(null)).toBe(false);
    expect(isGeminiClient({ chat: {} })).toBe(false); // OpenAI-style
    expect(isGeminiClient({ messages: {} })).toBe(false); // Anthropic-style
  });
});
