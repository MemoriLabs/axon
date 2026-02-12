import { describe, it, expect, vi } from 'vitest';
import { Axon } from '@/core/axon.js';
import { LLMRegistry } from '@/llm/registry.js';
import { UnsupportedLLMProviderError } from '@/errors/index.js';

describe('LLMRegistry', () => {
  it('should throw UnsupportedLLMProviderError when registering an unknown client', () => {
    const axon = new Axon();
    const unknownClient = { foo: 'bar' };
    expect(() => {
      axon.llm.register(unknownClient);
    }).toThrow(UnsupportedLLMProviderError);
  });

  it('should successfully register a known provider', () => {
    const axon = new Axon();
    const mockClient = { _isMock: true };
    const mockPatcher = vi.fn();

    // 1. Register a global provider definition
    LLMRegistry.registerProvider(
      (client: any) => client?._isMock === true, // Matcher
      mockPatcher // Patcher
    );

    // 2. Register a specific client instance
    axon.llm.register(mockClient);

    // 3. Verify the patcher was called
    expect(mockPatcher).toHaveBeenCalledWith(mockClient, axon);
  });
});
