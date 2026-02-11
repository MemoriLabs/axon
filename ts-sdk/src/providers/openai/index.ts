import { registerClient } from '../../hooks/index.js';
import { isOpenAIClient } from './detect.js';
import { patchOpenAIClient } from './proxy.js';

let registered = false;

export function register(): void {
  if (registered) return;
  registerClient(isOpenAIClient, patchOpenAIClient);
  registered = true;
}

// Auto-register on import
register();

// Export adapters and utilities for direct use
export { OpenAIResponsesAdapter, OpenAIChatCompletionsAdapter } from './adapter.js';
export { isOpenAIClient } from './detect.js';
export type { OpenAIClient } from './types.js';
