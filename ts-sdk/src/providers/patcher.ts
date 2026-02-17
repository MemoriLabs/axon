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

type PatchableFunction = ((...args: unknown[]) => Promise<unknown>) & {
  __axon_patched__?: boolean;
  __axon_original__?: unknown;
};

type PatchedParent = Record<string, unknown> & {
  __axon_patched__?: boolean;
};

export function patchMethod<TArgs, TOutput>(opts: PatchMethodOpts<TArgs, TOutput>): boolean {
  if (!opts.parent || typeof opts.parent !== 'object') return false;

  const parentObj = opts.parent as PatchedParent;
  const originalMethod = parentObj[opts.methodName];

  if (typeof originalMethod !== 'function') return false;
  const typedMethod = originalMethod as PatchableFunction;

  // 1. Idempotency Check:
  // If we have already wrapped this function instance, return true (success).
  if (patchedObjects.has(typedMethod)) return true;

  // Check if it was marked by legacy means (or strictly on the function itself)
  if (typedMethod.__axon_patched__) return true;

  const proxy = new HookedCreateProxy<TArgs, TOutput>({
    create: typedMethod.bind(parentObj) as (input: TArgs) => Promise<TOutput>,
    axon: opts.axon,
    ctxMetadata: opts.ctxMetadata,
    argsToRequest: opts.argsToRequest,
    requestToArgs: opts.requestToArgs,
    rawToResponse: opts.rawToResponse,
    applyCanonicalToRaw: opts.applyCanonicalToRaw,
    chunkToText: opts.chunkToText,
  });

  const wrapped = CreateFacade.wrap(typedMethod as (input: TArgs) => Promise<TOutput>, proxy);

  // 2. Set Metadata:
  // Store the original method so tests (and users) can access it if needed.
  const wrappedWithMeta = wrapped as PatchableFunction;
  wrappedWithMeta.__axon_original__ = originalMethod;
  wrappedWithMeta.__axon_patched__ = true;

  parentObj[opts.methodName] = wrappedWithMeta;
  patchedObjects.add(wrappedWithMeta);

  // Also mark the parent object if convenient, though method-marking is more precise.
  parentObj.__axon_patched__ = true;

  return true;
}
