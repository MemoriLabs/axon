import { AnthropicClient } from './types.js';

/**
 * Detects if the provided object is an initialized Anthropic client instance.
 * @param client - The object to inspect.
 * @returns True if it matches the Anthropic client shape.
 */
export function isAnthropicClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const obj = client as AnthropicClient;

  return !!(obj.messages && typeof obj.messages.create === 'function');
}
