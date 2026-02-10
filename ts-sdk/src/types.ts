export type Role = "system" | "user" | "assistant" | "tool";

import { randomUUID } from "node:crypto";

export interface Message {
  role: Role;
  content: string;
}

export interface CallContext {
  traceId: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
}

export interface LLMRequest {
  messages: Message[];
  model?: string;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Usage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: Usage;
  raw?: unknown;
  metadata?: Record<string, unknown>;
}

export function createCallContext(init?: Partial<CallContext>): CallContext {
  return {
    traceId: init?.traceId ?? randomUUID(),
    startedAt: init?.startedAt ?? new Date(),
    metadata: init?.metadata ?? {},
  };
}
