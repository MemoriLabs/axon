import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patchOpenAIClient } from '@/providers/openai/proxy.js';
import { Axon } from '@/core/axon.js';

describe('OpenAI Proxy Patcher', () => {
  let axon: Axon;
  let mockCreate: any;
  let mockClient: any;

  beforeEach(() => {
    axon = new Axon();
    // Spy on the Axon lifecycle methods
    vi.spyOn(axon, 'runBefore').mockImplementation(async (req) => req);
    vi.spyOn(axon, 'runAfter').mockImplementation(async (_req, res) => res);

    mockCreate = vi.fn().mockResolvedValue({
      id: 'test-id',
      choices: [{ message: { content: 'Hello world' } }],
      usage: { total_tokens: 10 },
    });

    mockClient = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
      responses: {
        create: mockCreate,
      },
    };
  });

  it('should patch and execute chat.completions.create', async () => {
    patchOpenAIClient(mockClient, axon);

    // 1. Check if patched
    expect(mockClient.chat.completions.create).not.toBe(mockCreate);

    // 2. Execute the patched method
    const inputArgs = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.7,
    };

    const result = await mockClient.chat.completions.create(inputArgs);

    // 3. Verify Original Method called with correct args
    expect(mockCreate).toHaveBeenCalledWith(inputArgs);

    // 4. Verify Axon Lifecycle triggered
    expect(axon.runBefore).toHaveBeenCalled();
    expect(axon.runAfter).toHaveBeenCalled();

    // 5. Verify Result passed through
    expect(result).toEqual({
      id: 'test-id',
      choices: [{ message: { content: 'Hello world' } }],
      usage: { total_tokens: 10 },
    });
  });

  it('should patch and execute responses.create', async () => {
    // Setup mock for text response style
    mockCreate.mockResolvedValue({
      output_text: 'Response text',
      usage: { total_tokens: 5 },
    });

    patchOpenAIClient(mockClient, axon);

    const inputArgs = {
      model: 'gpt-4-responses',
      input: 'Test input',
    };

    await mockClient.responses.create(inputArgs);

    // The proxy normalizes 'input' string to a message array
    const expectedArgs = {
      ...inputArgs,
      input: [{ role: 'user', content: 'Test input' }],
    };

    expect(mockCreate).toHaveBeenCalledWith(expectedArgs);
    expect(axon.runBefore).toHaveBeenCalled();
    expect(axon.runAfter).toHaveBeenCalled();
  });

  it('should throw error if client has no patchable APIs', () => {
    expect(() => {
      patchOpenAIClient({}, axon);
    }).toThrow(/no patchable APIs/);
  });
});
