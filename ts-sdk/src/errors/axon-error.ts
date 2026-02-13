/**
 * Base class for all Axon-related errors.
 */
export class AxonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AxonError';
  }
}
