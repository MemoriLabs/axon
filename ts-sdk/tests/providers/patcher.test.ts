import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patchMethod } from '@/providers/patcher.js';
import { Axon } from '@/core/axon.js';

describe('Provider Patcher Utility', () => {
  let axon: Axon;
  let mockClient: any;
  let mockCreate: any;

  beforeEach(() => {
    axon = new Axon();
    mockCreate = vi.fn().mockResolvedValue({ result: 'original' });
    mockClient = {
      api: {
        create: mockCreate,
      },
    };
  });

  const validOpts = {
    methodName: 'create',
    ctxMetadata: { test: true },
    argsToRequest: (args: any) => ({ messages: [], model: args.model }),
    requestToArgs: (req: any) => ({ model: req.model }),
    rawToResponse: (raw: any) => ({ content: raw.result }),
  };

  it('should return false if parent object is invalid', () => {
    const success = patchMethod({
      ...validOpts,
      axon,
      parent: null,
    });
    expect(success).toBe(false);
  });

  it('should return false if method does not exist', () => {
    const success = patchMethod({
      ...validOpts,
      axon,
      parent: {}, // No create method
    });
    expect(success).toBe(false);
  });

  it('should patch a valid method', async () => {
    const success = patchMethod({
      ...validOpts,
      axon,
      parent: mockClient.api,
    });

    expect(success).toBe(true);
    expect(mockClient.api.create).not.toBe(mockCreate);
    expect(mockClient.api.create.__axon_original__).toBe(mockCreate);
  });

  it('should prevent double patching', () => {
    patchMethod({ ...validOpts, axon, parent: mockClient.api });
    const firstPatch = mockClient.api.create;

    // Try patching again
    const result = patchMethod({ ...validOpts, axon, parent: mockClient.api });

    expect(result).toBe(true); // Should return true indicating "it is patched"
    expect(mockClient.api.create).toBe(firstPatch); // Should be the exact same function instance
  });

  it('should execute the full lifecycle', async () => {
    patchMethod({ ...validOpts, axon, parent: mockClient.api });

    const beforeSpy = vi.spyOn(axon, 'runBefore');
    const afterSpy = vi.spyOn(axon, 'runAfter');

    await mockClient.api.create({ model: 'test-model' });

    expect(beforeSpy).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({ model: 'test-model' });
    expect(afterSpy).toHaveBeenCalled();
  });
});
