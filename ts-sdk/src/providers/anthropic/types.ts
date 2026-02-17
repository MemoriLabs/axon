export interface AnthropicMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
}

export interface AnthropicCreateArgs {
  model: string;
  messages: AnthropicMessage[];
  stream?: boolean;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage?: AnthropicUsage;
  [key: string]: unknown;
}

export interface AnthropicStreamEvent {
  type: string;
  delta?: { type: string; text?: string };
  usage?: AnthropicUsage;
  [key: string]: unknown;
}

export interface AnthropicClient {
  messages: {
    create: (args: AnthropicCreateArgs) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
}
