export { registerClient, patchClient } from './registry.js';
export type { Matcher, Patcher } from './registry.js';
export {
  HookedCreateProxy,
  CreateFacade,
  type KwargsToRequest,
  type RequestToKwargs,
  type RawToResponse,
  type ApplyCanonicalToRaw,
} from './hooked.js';
