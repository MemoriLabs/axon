import { AxonError } from './axon-error.js';

export class AxonAdapterError extends AxonError {
  public readonly adapterName: string;
  public readonly cause: unknown;

  constructor(opts: { adapterName: string; cause: unknown }) {
    super(`Adapter ${opts.adapterName} failed: ${String(opts.cause)}`);
    this.name = 'AxonAdapterError';
    this.adapterName = opts.adapterName;
    this.cause = opts.cause;
  }
}
