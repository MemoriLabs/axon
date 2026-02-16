import { describe, it, expect } from 'vitest';
import { isAnthropicClient } from '@/providers/anthropic/detect.js';

describe('Anthropic Detection', () => {
  it('should return true for a valid Anthropic client', () => {
    const mockClient = {
      messages: {
        create: async () => {},
      },
    };
    expect(isAnthropicClient(mockClient)).toBe(true);
  });

  it('should return false for invalid objects', () => {
    expect(isAnthropicClient({})).toBe(false);
    expect(isAnthropicClient(null)).toBe(false);
    expect(isAnthropicClient({ chat: {} })).toBe(false); // OpenAI-style
  });
});
