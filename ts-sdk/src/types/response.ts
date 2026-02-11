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
