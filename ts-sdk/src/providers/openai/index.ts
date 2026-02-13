import { LLMRegistry } from '../../llm/registry.js';
import { isOpenAIClient } from './detect.js';
import { patchOpenAIClient } from './proxy.js';

/**
 * Auto-registers the OpenAI provider strategy.
 * @internal
 */
export function register(): void {
  LLMRegistry.registerProvider(isOpenAIClient, patchOpenAIClient);
}

register();

export { isOpenAIClient };
export * from './types.js';
