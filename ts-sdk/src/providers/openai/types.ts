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
