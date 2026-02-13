import { randomUUID } from 'node:crypto';

/**
 * Context data that persists throughout the lifecycle of a single LLM call.
 */
export interface CallContext {
  /** A unique identifier for this specific call execution. */
  traceId: string;
  /** The timestamp when the call started. */
  startedAt: Date;
  /** Custom metadata that can be read/written by hooks. */
  metadata: Record<string, unknown>;
}

/**
 * Creates a default call context.
 * @internal
 */
export function createCallContext(init?: Partial<CallContext>): CallContext {
  return {
    traceId: init?.traceId ?? randomUUID(),
    startedAt: init?.startedAt ?? new Date(),
    metadata: init?.metadata ?? {},
  };
}
