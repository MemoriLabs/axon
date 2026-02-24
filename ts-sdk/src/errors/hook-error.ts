import { AxonError } from './axon-error.js';

/**
 * Thrown when a 'before' or 'after' hook fails execution.
 */
export class AxonHookError extends AxonError {
  public readonly hook: 'before_call' | 'after_call';
  public readonly cause: unknown;

  constructor(opts: { hook: 'before_call' | 'after_call'; cause: unknown }) {
    super(
      `Axon '${opts.hook}' hook failed during execution. Check your registered hook implementation. Underlying cause: ${String(opts.cause)}`
    );
    this.name = 'AxonHookError';
    this.hook = opts.hook;
    this.cause = opts.cause;
  }
}
