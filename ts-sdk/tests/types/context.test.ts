import { describe, it, expect } from 'vitest';
import { createCallContext } from '@/types/context.js';

describe('CallContext', () => {
  it('should generate defaults when no options provided', () => {
    const ctx = createCallContext();
    expect(ctx.traceId).toBeDefined();
    expect(ctx.startedAt).toBeInstanceOf(Date);
    expect(ctx.metadata).toEqual({});
  });

  it('should use provided values', () => {
    const now = new Date();
    const ctx = createCallContext({
      traceId: '123',
      startedAt: now,
      metadata: { foo: 'bar' },
    });

    expect(ctx.traceId).toBe('123');
    expect(ctx.startedAt).toBe(now);
    expect(ctx.metadata).toEqual({ foo: 'bar' });
  });
});
