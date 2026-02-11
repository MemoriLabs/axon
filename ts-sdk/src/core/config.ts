import { AxonConfig } from '@/types/index.js';

export const defaultAxonConfig: Required<AxonConfig> = {
  failFast: true,
  postCallBackground: false,
  collectHookTimings: false,
};
