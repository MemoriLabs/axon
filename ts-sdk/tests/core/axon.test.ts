import { describe, it, expect } from 'vitest';
import { Axon } from '@/core/axon.js';
import { createCallContext, LLMRequest, LLMResponse } from '@/types/index.js';

describe('Axon', () => {
  it('should execute runBefore pipeline', async () => {
    const axon = new Axon();
    const ctx = createCallContext();
    const req: LLMRequest = { messages: [], model: 'test' };

    // Register a hook to ensure the pipeline actually runs logic
    axon.before.register((r) => ({ ...r, model: 'hooked' }));

    const result = await axon.runBefore(req, ctx);
    expect(result.model).toBe('hooked');
  });

  it('should execute runAfter pipeline', async () => {
    const axon = new Axon();
    const ctx = createCallContext();
    const req: LLMRequest = { messages: [], model: 'test' };
    const res: LLMResponse = { content: 'original' };

    // Register a hook
    axon.after.register((_req, r) => ({ ...r, content: 'hooked' }));

    const result = await axon.runAfter(req, res, ctx);
    expect(result.content).toBe('hooked');
  });
});
