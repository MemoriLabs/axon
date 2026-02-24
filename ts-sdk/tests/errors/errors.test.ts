import { describe, it, expect } from 'vitest';
import { AxonError, AxonHookError, UnsupportedLLMProviderError } from '@/errors/index.js';

describe('Errors', () => {
  it('AxonError should have correct name', () => {
    const err = new AxonError('msg');
    expect(err.name).toBe('AxonError');
    expect(err.message).toBe('msg');
  });

  it('AxonHookError should store hook details', () => {
    const cause = new Error('inner');
    const err = new AxonHookError({ hook: 'before_call', cause });

    expect(err.name).toBe('AxonHookError');
    expect(err.hook).toBe('before_call');
    expect(err.cause).toBe(cause);
    expect(err.message).toContain(`Axon 'before_call' hook failed during execution.`);
  });

  it('UnsupportedLLMProviderError should store provider name', () => {
    const err = new UnsupportedLLMProviderError('MyLLM');
    expect(err.provider).toBe('MyLLM');
    expect(err.message).toContain('MyLLM');
  });
});
