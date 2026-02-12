/**
 * OpenAI Provider - Type Definitions
 * 
 * This file contains TypeScript interfaces for the OpenAI client structure
 * and API method signatures. These types represent the minimal shape we need
 * from the OpenAI SDK to integrate with Axon.
 * 
 * @module providers/openai/types
 */

/**
 * Shape of arguments passed to OpenAI's responses.create() method
 */
export interface OpenAIResponsesCreateArgs {
  model: string;
  input: string | Array<{ role: string; content: string }>;
  [key: string]: unknown; // Allow additional parameters
}

/**
 * Shape of arguments passed to OpenAI's chat.completions.create() method
 */
export interface OpenAIChatCompletionsCreateArgs {
  model: string;
  messages: Array<{ role: string; content: string }>;
  [key: string]: unknown; // Allow additional parameters
}

/**
 * OpenAI Responses API structure
 */
export interface OpenAIResponsesAPI {
  create: (args: OpenAIResponsesCreateArgs) => Promise<unknown>;
  __axon_patched__?: boolean;
  [key: string]: unknown; // Allow other methods/properties
}

/**
 * OpenAI Chat Completions API structure
 */
export interface OpenAIChatCompletionsAPI {
  create: (args: OpenAIChatCompletionsCreateArgs) => Promise<unknown>;
  __axon_patched__?: boolean;
  [key: string]: unknown; // Allow other methods/properties
}

/**
 * OpenAI Chat namespace structure
 */
export interface OpenAIChatNamespace {
  completions: OpenAIChatCompletionsAPI;
  [key: string]: unknown; // Allow other APIs
}

/**
 * Complete OpenAI client structure
 * 
 * This represents the minimal shape of an OpenAI SDK client that
 * Axon needs to integrate with. Both responses and chat are optional
 * since different clients may only support one or the other.
 */
export interface OpenAIClient {
  responses?: OpenAIResponsesAPI;
  chat?: OpenAIChatNamespace;
  [key: string]: unknown; // Allow other client properties
}

/**
 * Type guard to check if a value is an OpenAI Responses client
 */
export function isOpenAIResponsesClient(client: unknown): client is Pick<OpenAIClient, 'responses'> {
  if (!client || typeof client !== 'object') return false;
  const obj = client as Partial<OpenAIClient>;
  return (
    obj.responses !== undefined &&
    typeof obj.responses === 'object' &&
    obj.responses !== null &&
    typeof obj.responses.create === 'function'
  );
}

/**
 * Type guard to check if a value is an OpenAI Chat client
 */
export function isOpenAIChatClient(client: unknown): client is Pick<OpenAIClient, 'chat'> {
  if (!client || typeof client !== 'object') return false;
  const obj = client as Partial<OpenAIClient>;
  return (
    obj.chat !== undefined &&
    typeof obj.chat === 'object' &&
    obj.chat !== null &&
    obj.chat.completions !== undefined &&
    typeof obj.chat.completions === 'object' &&
    obj.chat.completions !== null &&
    typeof obj.chat.completions.create === 'function'
  );
}