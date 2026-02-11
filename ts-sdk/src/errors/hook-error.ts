import { AxonError } from './axon-error.js';

export class AxonHookError extends AxonError {
  public readonly hook: 'before_call' | 'after_call';
  public readonly taskName: string;
  public readonly cause: unknown;

  constructor(opts: { hook: 'before_call' | 'after_call'; taskName: string; cause: unknown }) {
    super(`${opts.hook} hook failed for task ${opts.taskName}: ${String(opts.cause)}`);
    this.name = 'AxonHookError';
    this.hook = opts.hook;
    this.taskName = opts.taskName;
    this.cause = opts.cause;
  }
}
