import { LLMRegistry } from '../../llm/registry.js';
import { isAnthropicClient } from './detect.js';
import { patchAnthropicClient } from './proxy.js';

export function register(): void {
  LLMRegistry.registerProvider(isAnthropicClient, patchAnthropicClient);
}

register();

export { isAnthropicClient };
export * from './types.js';
