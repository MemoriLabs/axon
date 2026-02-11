export class AxonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AxonError';
  }
}
