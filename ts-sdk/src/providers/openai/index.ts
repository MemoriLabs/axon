/**
 * OpenAI Provider for Axon
 * 
 * This module provides integration between Axon and OpenAI's SDK,
 * supporting both the Responses API and Chat Completions API.
 * 
 * The provider auto-registers on import, so simply importing this
 * module enables OpenAI client support in Axon.
 * 
 * @module providers/openai
 * 
 * @example
 * ```typescript
 * // Auto-registration via import
 * import { Axon } from '@memori/axon';
 * import '@memori/axon/providers/openai'; // Auto-registers OpenAI support
 * import { OpenAI } from 'openai';
 * 
 * const client = new OpenAI();
 * const axon = new Axon({ tasks: [...] });
 * 
 * await axon.register(client);
 * 
 * // Now all OpenAI calls go through Axon hooks
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Direct adapter usage (no registration)
 * import { Axon } from '@memori/axon';
 * import { OpenAIChatCompletionsAdapter } from '@memori/axon/providers/openai';
 * import { OpenAI } from 'openai';
 * 
 * const client = new OpenAI();
 * const adapter = new OpenAIChatCompletionsAdapter(client, {
 *   defaultModel: 'gpt-4'
 * });
 * 
 * const axon = new Axon({ adapter, tasks: [...] });
 * 
 * const response = await axon.call({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */

import { registerClient } from '../../hooks/registry.js';
import { isOpenAIClient } from './detect.js';
import { patchOpenAIClient } from './proxy.js';

/**
 * Track whether the provider has been registered
 * @internal
 */
let registered = false;

/**
 * Register the OpenAI provider with Axon's registry
 * 
 * This function registers the matcher and patcher for OpenAI clients.
 * It's idempotent - calling it multiple times is safe.
 * 
 * Normally you don't need to call this directly as it's automatically
 * called when the module is imported.
 * 
 * @example
 * ```typescript
 * import { register } from '@memori/axon/providers/openai';
 * 
 * register(); // Manually register if needed
 * ```
 */
export function register(): void {
  if (registered) return;
  registerClient(isOpenAIClient, patchOpenAIClient);
  registered = true;
}

// Auto-register when this module is imported
register();

// =============================================================================
// Public Exports
// =============================================================================

/**
 * Direct adapters for using OpenAI clients without registration
 * 
 * These classes wrap OpenAI client methods to work with Axon's
 * canonical types, allowing direct usage with `new Axon({ adapter })`.
 */
export { OpenAIResponsesAdapter, OpenAIChatCompletionsAdapter } from './adapter.js';

/**
 * Client detection utility
 * 
 * Use this to check if a client is an OpenAI SDK instance.
 */
export { isOpenAIClient } from './detect.js';

/**
 * TypeScript type definitions
 * 
 * Import these for type annotations when working with OpenAI clients.
 */
export type { OpenAIClient } from './types.js';

/**
 * OpenAI response type definitions
 * 
 * These types represent the structure of responses from OpenAI's APIs.
 * Useful for working with raw responses in hooks or adapters.
 */
export type {
  OpenAIResponse,
  OpenAIChatCompletionResponse,
  OpenAIStructuredResponse,
  OpenAITextResponse,
  OpenAIChatMessage,
  OpenAIChatChoice,
  OpenAIUsage,
} from './responses.js';