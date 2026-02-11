import { randomUUID } from 'node:crypto';

export interface CallContext {
  traceId: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
}

export function createCallContext(init?: Partial<CallContext>): CallContext {
  return {
    traceId: init?.traceId ?? randomUUID(),
    startedAt: init?.startedAt ?? new Date(),
    metadata: init?.metadata ?? {},
  };
}
