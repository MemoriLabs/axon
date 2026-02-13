import { AxonConfig } from '../types/config.js';

/**
 * The default configuration values used when no overrides are provided.
 */
export const defaultAxonConfig: Required<AxonConfig> = {
  failFast: true,
  postCallBackground: false,
  collectHookTimings: false,
};
