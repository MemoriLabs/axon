import { LLMRegistry } from '../../llm/registry.js';
import { isGeminiClient } from './detect.js';
import { patchGeminiClient } from './proxy.js';

export function register(): void {
  LLMRegistry.registerProvider(isGeminiClient, patchGeminiClient);
}

register();

export { isGeminiClient };
export * from './types.js';
