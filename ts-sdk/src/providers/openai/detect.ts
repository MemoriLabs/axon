import { OpenAIClient } from './types.js';

/**
 * Detects if the provided object is an initialized OpenAI client instance.
 * @param client - The object to inspect.
 * @returns True if it matches the OpenAI client shape.
 */
export function isOpenAIClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const obj = client as OpenAIClient;

  const hasResponses = !!(obj.responses && typeof obj.responses.create === 'function');
  const hasChat = !!(obj.chat?.completions && typeof obj.chat.completions.create === 'function');

  return hasResponses || hasChat;
}
