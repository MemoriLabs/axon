import type { CallContext } from './context.js';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
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

/**
 * Interface for objects that can handle a direct Axon call.
 */
export interface LLMAdapter {
  call: (request: LLMRequest, ctx: CallContext) => LLMResponse | Promise<LLMResponse>;
}
