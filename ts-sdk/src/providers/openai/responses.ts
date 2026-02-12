/**
 * OpenAI Provider - Response Type Definitions
 * 
 * This file contains TypeScript interfaces representing the structure of
 * responses returned by OpenAI's APIs. These types cover multiple response
 * formats that OpenAI has used across different API versions.
 * 
 * @module providers/openai/responses
 */

/**
 * Token usage information from OpenAI responses
 */
export interface OpenAIUsage {
  /** Input tokens (newer APIs) */
  input_tokens?: number;
  /** Prompt tokens (older APIs) */
  prompt_tokens?: number;
  /** Output tokens (newer APIs) */
  output_tokens?: number;
  /** Completion tokens (older APIs) */
  completion_tokens?: number;
  /** Total tokens used */
  total_tokens?: number;
}

/**
 * A single message in chat completion responses
 */
export interface OpenAIChatMessage {
  role: string;
  content: string;
  [key: string]: unknown;
}

/**
 * A choice in chat completion responses
 */
export interface OpenAIChatChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason?: string;
  [key: string]: unknown;
}

/**
 * Chat Completions API response format
 * Used by: chat.completions.create()
 */
export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage?: OpenAIUsage;
  [key: string]: unknown;
}

/**
 * Content item within output items (newer format)
 */
export interface OpenAIContentItem {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Output item in structured responses (newer format)
 */
export interface OpenAIOutputItem {
  index: number;
  content: OpenAIContentItem[];
  [key: string]: unknown;
}

/**
 * Responses API response format (newer structured format)
 * Used by: responses.create() with structured output
 */
export interface OpenAIStructuredResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output: OpenAIOutputItem[];
  usage?: OpenAIUsage;
  [key: string]: unknown;
}

/**
 * Responses API response format (legacy text format)
 * Used by: responses.create() with text output
 */
export interface OpenAITextResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output_text: string;
  usage?: OpenAIUsage;
  [key: string]: unknown;
}

/**
 * Union type representing any valid OpenAI response format
 */
export type OpenAIResponse =
  | OpenAIChatCompletionResponse
  | OpenAIStructuredResponse
  | OpenAITextResponse;

/**
 * Type guard to check if response has chat completion format
 */
export function isChatCompletionResponse(
  response: unknown
): response is OpenAIChatCompletionResponse {
  if (!response || typeof response !== 'object') return false;
  const obj = response as Partial<OpenAIChatCompletionResponse>;
  return Array.isArray(obj.choices) && obj.choices.length > 0;
}

/**
 * Type guard to check if response has text output format
 */
export function isTextResponse(response: unknown): response is OpenAITextResponse {
  if (!response || typeof response !== 'object') return false;
  const obj = response as Partial<OpenAITextResponse>;
  return typeof obj.output_text === 'string';
}

/**
 * Type guard to check if response has structured output format
 */
export function isStructuredResponse(response: unknown): response is OpenAIStructuredResponse {
  if (!response || typeof response !== 'object') return false;
  const obj = response as Partial<OpenAIStructuredResponse>;
  return Array.isArray(obj.output);
}

/**
 * Type guard to check if response has usage information
 */
export function hasUsage(response: unknown): response is { usage: OpenAIUsage } {
  if (!response || typeof response !== 'object') return false;
  const obj = response as { usage?: unknown };
  return obj.usage !== undefined && typeof obj.usage === 'object' && obj.usage !== null;
}