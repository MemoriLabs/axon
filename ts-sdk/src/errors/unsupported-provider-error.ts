import { AxonError } from './axon-error.js';

/**
 * Thrown when attempting to register a client that Axon does not recognize.
 */
export class UnsupportedLLMProviderError extends AxonError {
  public readonly provider: string;

  constructor(provider: string) {
    super(`Unsupported LLM provider: ${provider}`);
    this.name = 'UnsupportedLLMProviderError';
    this.provider = provider;
  }
}
