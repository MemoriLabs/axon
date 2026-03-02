import { describe, it, expect } from 'vitest';
import { HookPipeline } from '@/hooks/pipeline.js';
import { LLMRequest, LLMResponse, CallContext } from '@/types/index.js';

describe('HookPipeline', () => {
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
      const pipeline = new HookPipeline('before');
      pipeline.add((req) => {
        req.messages[0].content += ' 1';
        return req;
      });
      const result = (await pipeline.execute(mockReq, mockCtx)) as LLMRequest;
      expect(result.messages[0].content).toBe('hello 1');
    });
  });

  describe('After Hooks', () => {
    it('should execute "after" hooks in sequence', async () => {
      const pipeline = new HookPipeline('after');

      // Hook 1: Uppercase
      pipeline.add((_req, res) => {
        return { ...res, content: res.content.toUpperCase() };
      });

      // Hook 2: Append punctuation
      pipeline.add((_req, res) => {
        return { ...res, content: res.content + '!' };
      });

      const result = (await pipeline.execute(mockReq, mockRes, mockCtx)) as LLMResponse;
      expect(result.content).toBe('ORIGINAL RESPONSE!');
    });

    it('should use original response if hook returns undefined', async () => {
      const pipeline = new HookPipeline('after');
      pipeline.add(() => undefined); // Returns nothing

      const result = (await pipeline.execute(mockReq, mockRes, mockCtx)) as LLMResponse;
      expect(result).toEqual(mockRes);
    });
  });
});
