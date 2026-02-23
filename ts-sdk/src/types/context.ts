import { randomUUID } from 'node:crypto';

/**
 * Context data that persists throughout the lifecycle of a single LLM call.
 */
export interface CallContext {
  traceId: string;
  startedAt: Date;
  metadata: {
    platform?: string | null;
    framework?: string | null;
    provider?: string | null;
    method?: string | null;
    sdkVersion?: string | null;
    [key: string]: unknown;
  };
}

/**
 * Creates a default call context
 * @internal
 */
export function createCallContext(init?: Partial<CallContext>): CallContext {
  return {
    traceId: init?.traceId ?? randomUUID(),
    startedAt: init?.startedAt ?? new Date(),
    metadata: {
      platform: null,
      framework: null,
      ...init?.metadata,
    },
  };
}
