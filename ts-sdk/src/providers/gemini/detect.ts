import { GeminiClient } from './types.js';

/**
 * Detects if the provided object is an initialized Google Gemini client instance.
 * @param client - The object to inspect.
 * @returns True if it matches the Gemini client shape.
 */
export function isGeminiClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const obj = client as GeminiClient;

  return !!(obj.models && typeof obj.models.generateContent === 'function');
}
