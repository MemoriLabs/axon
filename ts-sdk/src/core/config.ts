import { AxonConfig } from '../types/config.js';

export const defaultAxonConfig: Required<AxonConfig> = {
  failFast: true,
  postCallBackground: false,
  collectHookTimings: false,
};
