import { describe, it, expect } from 'vitest';
import { isOpenAIClient } from '@/providers/openai/detect.js';

describe('OpenAI Detection', () => {
  it('should return true for a valid OpenAI-like chat completion client', () => {
    const mockClient = {
      chat: {
        completions: { create: () => {} },
      },
    };
    expect(isOpenAIClient(mockClient)).toBe(true);
  });

  it('should return true for a valid OpenAI-like responses client', () => {
    const mockClient = {
      responses: { create: () => {} },
    };
    expect(isOpenAIClient(mockClient)).toBe(true);
  });

  it('should return false for invalid objects', () => {
    expect(isOpenAIClient({})).toBe(false);
    expect(isOpenAIClient(null)).toBe(false);
    expect(isOpenAIClient({ chat: {} })).toBe(false);
  });
});
