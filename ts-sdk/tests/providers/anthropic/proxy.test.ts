import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patchAnthropicClient } from '@/providers/anthropic/proxy.js';
import { Axon } from '@/core/axon.js';

describe('Anthropic Proxy Patcher', () => {
  let axon: Axon;
  let mockCreate: any;
  let mockClient: any;

  beforeEach(() => {
    axon = new Axon();
    mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Hello world' }],
      usage: { input_tokens: 5, output_tokens: 5 },
    });

    mockClient = {
      messages: {
        create: mockCreate,
      },
    };
  });

  it('should patch and execute messages.create', async () => {
    patchAnthropicClient(mockClient, axon);

    // 1. Verify patching
    expect(mockClient.messages.create).not.toBe(mockCreate);

    // 2. Execute
    const inputArgs = {
      model: 'claude-3',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    };
    await mockClient.messages.create(inputArgs);

    // 3. Verify Original Method called
    expect(mockCreate).toHaveBeenCalledWith(inputArgs);
  });

  it('should throw if client has no messages API', () => {
    expect(() => {
      patchAnthropicClient({}, axon);
    }).toThrow(/no messages API/);
  });

  it('should handle streaming events', async () => {
    async function* mockStream() {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'A' } };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'B' } };
    }
    mockCreate.mockResolvedValue(mockStream());

    const afterSpy = vi.spyOn(axon, 'runAfter');
    patchAnthropicClient(mockClient, axon);

    const stream = await mockClient.messages.create({
      model: 'claude-3',
      messages: [],
      stream: true,
    });

    // Consume stream
    for await (const _ of stream) {
    }

    // Verify runAfter was called with aggregated text "AB"
    expect(afterSpy).toHaveBeenCalled();
    const args = afterSpy.mock.calls[0];
    expect(args[1].content).toBe('AB');
  });
});
