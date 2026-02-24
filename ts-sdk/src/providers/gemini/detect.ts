import { GeminiClient } from './types.js';

export function isGeminiClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const obj = client as GeminiClient;

  return !!(obj.models && typeof obj.models.generateContent === 'function');
}
