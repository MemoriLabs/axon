import { AxonError } from './axon-error.js';

export class AxonHookError extends AxonError {
  public readonly hook: 'before_call' | 'after_call';
  public readonly cause: unknown;

  constructor(opts: { hook: 'before_call' | 'after_call'; cause: unknown }) {
    super(`${opts.hook} hook failed: ${String(opts.cause)}`);
    this.name = 'AxonHookError';
    this.hook = opts.hook;
    this.cause = opts.cause;
  }
}
