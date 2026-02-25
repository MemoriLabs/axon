export interface OpenAIResponsesCreateArgs {
  model: string;
  input: string | Array<{ role: string; content: string }>;
  [key: string]: unknown;
}

export interface OpenAIChatCompletionsCreateArgs {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  [key: string]: unknown;
}

/**
 * The minimal expected shape of an initialized OpenAI client instance.
 * Axon uses this interface to detect and safely patch the `chat.completions.create`
 * and legacy `responses.create` methods.
 */
export interface OpenAIClient {
  responses?: {
    create: (args: OpenAIResponsesCreateArgs) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
  chat?: {
    completions?: {
      create: (args: OpenAIChatCompletionsCreateArgs) => Promise<unknown>;
      __axon_patched__?: boolean;
    };
  };
}
