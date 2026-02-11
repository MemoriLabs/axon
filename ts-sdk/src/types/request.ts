import type { Message } from './message.js';

export interface LLMRequest {
  messages: Message[];
  model?: string;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
