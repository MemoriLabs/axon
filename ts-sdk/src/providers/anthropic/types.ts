export interface AnthropicCreateArgs {
  model: string;
  messages: AnthropicMessage[];
  stream?: boolean;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface AnthropicMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
}

export interface AnthropicClient {
  messages: {
    create: (args: AnthropicCreateArgs) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
}
