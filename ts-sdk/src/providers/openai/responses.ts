export interface OpenAITextResponse {
  output_text: string;
  usage?: OpenAIUsage;
}

export interface OpenAIChatCompletionResponse {
  choices: Array<{
    message?: { content?: string };
    delta?: { content?: string };
  }>;
  usage?: OpenAIUsage;
}

export interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export function hasUsage(response: unknown): response is { usage: OpenAIUsage } {
  return !!response && typeof response === 'object' && 'usage' in response;
}
