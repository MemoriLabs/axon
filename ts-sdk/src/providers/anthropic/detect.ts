import { AnthropicClient } from './types.js';

export function isAnthropicClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const obj = client as AnthropicClient;

  return !!(obj.messages && typeof obj.messages.create === 'function');
}
