/**
 * Internal APIs for building custom LLM provider integrations.
 *
 * ⚠️ WARNING: These APIs are NOT covered by semantic versioning and may change
 * in minor or patch releases. Only use these if you're building a custom provider
 * integration for Axon.
 *
 * @packageDocumentation
 * @module @memori/axon/internal
 */

// Provider registration
export { registerClient, patchClient } from './hooks/registry.js';
export type { Matcher, Patcher } from './hooks/registry.js';

// Hook execution infrastructure
export {
  HookedCreateProxy,
  CreateFacade,
  type KwargsToRequest,
  type RequestToKwargs,
  type RawToResponse,
  type ApplyCanonicalToRaw,
} from './hooks/hooked.js';

// Note: Axon's internal hook methods (setLastContext, runBeforeHooks, runAfterHooks)
// are marked with @internal JSDoc tags and are accessible on the Axon instance itself.
// Import Axon from the main package and use those methods when building integrations.
