export { Axon } from './axon.js';
export { defaultAxonConfig } from './config.js';
export { AxonMonitor } from './monitor.js';

// --- Internal APIs for Provider Authors ---
export { registerClient, patchClient } from '../hooks/registry.js';
export type { Matcher, Patcher } from '../hooks/registry.js';

export {
  HookedCreateProxy,
  CreateFacade,
} from '../hooks/hooked.js';

export type {
  KwargsToRequest,
  RequestToKwargs,
  RawToResponse,
  ApplyCanonicalToRaw,
} from '../hooks/hooked.js';

// Timing infrastructure
export { getTimingsBucket, recordHookTiming, getTimingsForPhase } from './timing.js';
export type { HookTimingsBucket } from './timing.js';
export { getTaskName, getAdapterName } from './utils.js';