import type { Axon } from '../core/axon.js';
import {
  HookedCreateProxy,
  CreateFacade,
  ArgsToRequest,
  RequestToArgs,
  RawToResponse,
  ApplyCanonicalToRaw,
} from '../hooks/hooked.js';

// Global registry of patched methods to prevent double-wrapping
const patchedObjects = new WeakSet();

export interface PatchMethodOpts<TArgs, TOutput> {
  axon: Axon;
  parent: unknown;
  methodName: string;
  ctxMetadata: Record<string, unknown>;
  argsToRequest: ArgsToRequest<TArgs>;
  requestToArgs: RequestToArgs<TArgs>;
  rawToResponse: RawToResponse<TOutput>;
  applyCanonicalToRaw?: ApplyCanonicalToRaw<TOutput>;
  chunkToText?: (chunk: unknown) => string | undefined;
}

export function patchMethod<TArgs, TOutput>(opts: PatchMethodOpts<TArgs, TOutput>): boolean {
  if (!opts.parent || typeof opts.parent !== 'object') return false;

  const parentObj = opts.parent as Record<string, any>;
  const originalMethod = parentObj[opts.methodName];

  if (typeof originalMethod !== 'function') return false;

  // 1. Idempotency Check:
  // If we have already wrapped this function instance, return true (success).
  if (patchedObjects.has(originalMethod)) return true;

  // Check if it was marked by legacy means (or strictly on the function itself)
  if (originalMethod['__axon_patched__']) return true;

  const proxy = new HookedCreateProxy<TArgs, TOutput>({
    create: originalMethod.bind(parentObj),
    axon: opts.axon,
    ctxMetadata: opts.ctxMetadata,
    argsToRequest: opts.argsToRequest,
    requestToArgs: opts.requestToArgs,
    rawToResponse: opts.rawToResponse,
    applyCanonicalToRaw: opts.applyCanonicalToRaw,
    chunkToText: opts.chunkToText,
  });

  const wrapped = CreateFacade.wrap(originalMethod as (input: TArgs) => Promise<TOutput>, proxy);

  // 2. Set Metadata:
  // Store the original method so tests (and users) can access it if needed.
  (wrapped as any).__axon_original__ = originalMethod;
  (wrapped as any).__axon_patched__ = true;

  parentObj[opts.methodName] = wrapped;
  patchedObjects.add(wrapped);

  // Also mark the parent object if convenient, though method-marking is more precise.
  (parentObj as any).__axon_patched__ = true;

  return true;
}
