/**
 * Shape of arguments passed to OpenAI's responses.create() method
 */
export interface OpenAIResponsesCreateArgs {
  model: string;
  input: string | Array<{ role: string; content: string }>;
  [key: string]: unknown;
}

/**
 * Shape of arguments passed to OpenAI's chat.completions.create() method
 */
export interface OpenAIChatCompletionsCreateArgs {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  [key: string]: unknown;
}

/**
 * OpenAI Client Interface
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
