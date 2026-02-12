/**
 * OpenAI Provider - Client Detection
 * 
 * This file contains the matcher function that detects whether a given
 * client is an OpenAI SDK instance. The registry uses this to determine
 * if the OpenAI provider should handle a particular client.
 * 
 * @module providers/openai/detect
 */

/**
 * Detect if a client is an OpenAI SDK instance
 * 
 * This function checks for the presence of OpenAI SDK APIs:
 * - `responses.create()` method (Responses API)
 * - `chat.completions.create()` method (Chat Completions API)
 * 
 * A client is considered an OpenAI client if it has either of these APIs.
 * 
 * @param client - The client object to check
 * @returns true if client appears to be an OpenAI SDK instance
 * 
 * @example
 * ```typescript
 * import { OpenAI } from 'openai';
 * import { isOpenAIClient } from '@memori/axon/providers/openai';
 * 
 * const client = new OpenAI();
 * isOpenAIClient(client); // true
 * 
 * isOpenAIClient({}); // false
 * isOpenAIClient(null); // false
 * ```
 */
export function isOpenAIClient(client: unknown): boolean {
  // Must be an object
  if (!client || typeof client !== 'object') {
    return false;
  }

  const obj = client as Record<string, unknown>;

  // Check for responses API
  if (obj.responses && typeof obj.responses === 'object' && obj.responses !== null) {
    const responses = obj.responses as Record<string, unknown>;
    if (typeof responses.create === 'function') {
      return true;
    }
  }

  // Check for chat.completions API
  if (obj.chat && typeof obj.chat === 'object' && obj.chat !== null) {
    const chat = obj.chat as Record<string, unknown>;
    if (chat.completions && typeof chat.completions === 'object' && chat.completions !== null) {
      const completions = chat.completions as Record<string, unknown>;
      if (typeof completions.create === 'function') {
        return true;
      }
    }
  }

  return false;
}