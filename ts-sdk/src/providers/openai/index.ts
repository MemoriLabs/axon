import { LLMRegistry } from '../../llm/registry.js';
import { isOpenAIClient } from './detect.js';
import { patchOpenAIClient } from './proxy.js';

export function register(): void {
  LLMRegistry.registerProvider(isOpenAIClient, patchOpenAIClient);
}

register();

export { isOpenAIClient };
export * from './types.js';
