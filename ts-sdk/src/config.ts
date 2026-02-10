export interface AxonConfig {
  failFast?: boolean;
  postCallBackground?: boolean;
  collectHookTimings?: boolean;
}

export const defaultAxonConfig: Required<AxonConfig> = {
  failFast: true,
  postCallBackground: false,
  collectHookTimings: false,
};
