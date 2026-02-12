import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookedCreateProxy, HookedStream, CreateFacade } from '@/hooks/hooked.js';
import { Axon } from '@/core/axon.js';
import { createCallContext, LLMRequest, LLMResponse } from '@/types/index.js';

describe('Hooked Mechanics', () => {
  let mockAxon: Axon;

  beforeEach(() => {
    mockAxon = new Axon();
    // Mock the internal run methods
    mockAxon.runBefore = vi.fn().mockImplementation((req) => Promise.resolve(req));
    mockAxon.runAfter = vi.fn().mockImplementation((_req, res) => Promise.resolve(res));
  });

  describe('HookedCreateProxy', () => {
    const mockInput = { prompt: 'test' };
    const mockOutput = { result: 'success' };

    // Simple converters for the test
    const argsToRequest = (args: any): LLMRequest => ({
      messages: [{ role: 'user', content: args.prompt }],
    });
    const requestToArgs = (req: LLMRequest) => ({ prompt: req.messages[0].content });
    const rawToResponse = (raw: any): LLMResponse => ({ content: raw.result, raw });

    it('should execute the full lifecycle for a standard call', async () => {
      const mockCreate = vi.fn().mockResolvedValue(mockOutput);

      const proxy = new HookedCreateProxy({
        create: mockCreate,
        axon: mockAxon,
        ctxMetadata: { test: true },
        argsToRequest,
        requestToArgs,
        rawToResponse,
      });

      const result = await proxy.executeCreate(mockInput);

      expect(mockAxon.runBefore).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(mockInput);
      expect(mockAxon.runAfter).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockOutput);
    });

    it('should handle modified requests from runBefore', async () => {
      const mockCreate = vi.fn().mockResolvedValue(mockOutput);

      // Mock runBefore to modify the prompt
      mockAxon.runBefore = vi.fn().mockImplementation(async (req) => {
        return { ...req, messages: [{ role: 'user', content: 'modified' }] };
      });

      const proxy = new HookedCreateProxy({
        create: mockCreate,
        axon: mockAxon,
        ctxMetadata: {},
        argsToRequest,
        requestToArgs,
        rawToResponse,
      });

      await proxy.executeCreate(mockInput);

      // Verify the create function received the MODIFIED arg
      expect(mockCreate).toHaveBeenCalledWith({ prompt: 'modified' });
    });
  });

  describe('HookedStream', () => {
    it('should accumulate content and call runAfter upon completion', async () => {
      // Create an async generator mimicking an LLM stream
      async function* mockStreamGen() {
        yield { YZ: 'Hel' };
        yield { delta: 'lo' };
      }

      const stream = mockStreamGen();
      const mockRequest = { messages: [], model: 'test' };
      const mockCtx = createCallContext();

      const hookedStream = new HookedStream(
        stream,
        mockRequest,
        mockCtx,
        mockAxon,
        (chunk: any) => chunk.delta || chunk.YZ, // Chunk to text
        () => 'final-raw' // Get final response
      );

      // Consume the stream
      const chunks = [];
      for await (const chunk of hookedStream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);

      // Verify runAfter was called with the combined text
      expect(mockAxon.runAfter).toHaveBeenCalledTimes(1);

      // FIXED: Access .mock.calls instead of .calls
      const [_req, res, _ctx] = (mockAxon.runAfter as any).mock.calls[0];
      expect(res.content).toBe('Hello');
    });
  });

  describe('CreateFacade', () => {
    it('should wrap a function and preserve static properties', () => {
      const original = async () => 'original';
      (original as any).someProp = 'test';

      const proxy = { executeCreate: vi.fn() } as any;
      const wrapped = CreateFacade.wrap(original, proxy);

      expect(wrapped).not.toBe(original);
      expect((wrapped as any).someProp).toBe('test');
    });
  });
});
