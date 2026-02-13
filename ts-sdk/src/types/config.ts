/**
 * Configuration options for the Axon runtime.
 */
export interface AxonConfig {
  /**
   * If `true`, the process will throw an error immediately if a hook fails.
   * If `false`, errors in hooks are logged but execution continues.
   * @default true
   */
  failFast?: boolean;

  /**
   * If `true`, 'after' hooks are executed asynchronously without blocking the return of the LLM response.
   * Useful for logging/tracing without adding latency.
   * @default false
   */
  postCallBackground?: boolean;

  /**
   * If `true`, Axon collects duration metrics for every hook execution.
   * @default false
   */
  collectHookTimings?: boolean;
}
