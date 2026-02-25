export interface AnthropicCreateArgs {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface AnthropicMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
}

/**
 * The minimal expected shape of an initialized Anthropic client instance.
 * Axon uses this interface to detect and safely patch the `messages.create` method.
 */
export interface AnthropicClient {
  messages?: {
    create: (args: AnthropicCreateArgs) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
}
