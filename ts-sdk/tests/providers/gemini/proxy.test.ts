import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patchGeminiClient } from '@/providers/gemini/proxy.js';
import { Axon } from '@/core/axon.js';

describe('Gemini Proxy Patcher', () => {
  let axon: Axon;
  let mockGenerateContent: any;
  let mockGenerateContentStream: any;
  let mockClient: any;

  beforeEach(() => {
    axon = new Axon();
    vi.spyOn(axon, 'runBefore').mockImplementation(async (req) => req);
    vi.spyOn(axon, 'runAfter').mockImplementation(async (_req, res) => res);

    mockGenerateContent = vi.fn().mockResolvedValue({
      text: 'Hello world',
      usageMetadata: { totalTokenCount: 10 },
    });

    mockGenerateContentStream = vi.fn();

    mockClient = {
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      },
    };
  });

  it('should patch and execute generateContent (unary)', async () => {
    patchGeminiClient(mockClient, axon);

    expect(mockClient.models.generateContent).not.toBe(mockGenerateContent);

    const inputArgs = {
      model: 'gemini-1.5-flash',
      contents: 'Hi',
    };

    const result = await mockClient.models.generateContent(inputArgs);

    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }], // Normalized by requestToArgs
    });

    expect(axon.runBefore).toHaveBeenCalled();
    expect(axon.runAfter).toHaveBeenCalled();
    expect(result.text).toBe('Hello world');
  });

  it('should patch and handle generateContentStream correctly', async () => {
    // 1. Setup a mocked AsyncGenerator response
    async function* mockStream() {
      yield { text: 'A' }; // Testing the fallback/direct text property
      yield { candidates: [{ content: { parts: [{ text: 'B' }] } }] }; // Testing nested candidates
    }
    mockGenerateContentStream.mockResolvedValue(mockStream());

    // 2. Setup a before hook that MODIFIES the context (to test our bug fix)
    vi.spyOn(axon, 'runBefore').mockImplementation(async (req) => {
      req.messages[0].content = 'Modified by hook';
      return req;
    });

    const afterSpy = vi.spyOn(axon, 'runAfter');

    patchGeminiClient(mockClient, axon);

    // 3. Execute stream
    const inputArgs = { model: 'gemini-1.5-flash', contents: 'Original prompt' };
    const stream = await mockClient.models.generateContentStream(inputArgs);

    // 4. Verify runBefore modification wasn't overwritten by the stream patcher!
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [{ role: 'user', parts: [{ text: 'Modified by hook' }] }],
        stream: true, // Should have been injected safely
      })
    );

    // 5. Consume stream
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(2);

    // 6. Verify runAfter received the correctly buffered text ('A' + 'B')
    expect(afterSpy).toHaveBeenCalled();
    const [_, res] = afterSpy.mock.calls[0];
    expect(res.content).toBe('AB');
  });

  it('should throw error if client has no models API', () => {
    expect(() => {
      patchGeminiClient({}, axon);
    }).toThrow(/no models API/);
  });
});
