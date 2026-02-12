import { describe, it, expect } from 'vitest';
import { HookRegistry } from '@/hooks/registry.js';
import { LLMRequest, LLMResponse, CallContext } from '@/types/index.js';

describe('HookRegistry', () => {
  const mockCtx: CallContext = {
    traceId: 'test-trace',
    startedAt: new Date(),
    metadata: {},
  };

  const mockReq: LLMRequest = {
    messages: [{ role: 'user', content: 'hello' }],
    model: 'gpt-4',
  };

  const mockRes: LLMResponse = {
    content: 'original response',
  };

  describe('Before Hooks', () => {
    it('should execute "before" hooks in sequence', async () => {
      const registry = new HookRegistry('before');
      registry.register((req) => {
        req.messages[0].content += ' 1';
        return req;
      });
      const result = (await registry.execute(mockReq, mockCtx)) as LLMRequest;
      expect(result.messages[0].content).toBe('hello 1');
    });
  });

  describe('After Hooks', () => {
    it('should execute "after" hooks in sequence', async () => {
      const registry = new HookRegistry('after');

      // Hook 1: Uppercase
      registry.register((_req, res) => {
        return { ...res, content: res.content.toUpperCase() };
      });

      // Hook 2: Append punctuation
      registry.register((_req, res) => {
        return { ...res, content: res.content + '!' };
      });

      const result = (await registry.execute(mockReq, mockRes, mockCtx)) as LLMResponse;
      expect(result.content).toBe('ORIGINAL RESPONSE!');
    });

    it('should use original response if hook returns undefined', async () => {
      const registry = new HookRegistry('after');
      registry.register(() => undefined); // Returns nothing

      const result = (await registry.execute(mockReq, mockRes, mockCtx)) as LLMResponse;
      expect(result).toEqual(mockRes);
    });
  });
});
