export interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage?: AnthropicUsage;
  [key: string]: unknown;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AnthropicStreamEvent {
  type: string;
  delta?: { type: string; text?: string };
  usage?: AnthropicUsage;
  [key: string]: unknown;
}
