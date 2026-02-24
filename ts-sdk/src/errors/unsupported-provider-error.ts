import { AxonError } from './axon-error.js';
import { SUPPORTED_PROVIDERS } from '../utils/constants.js';

/**
 * Thrown when attempting to register a client that Axon does not recognize.
 */
export class UnsupportedLLMProviderError extends AxonError {
  public readonly provider: string;

  constructor(provider: string) {
    super(
      `Unsupported LLM provider: '${provider}'. Axon currently supports patching: ${SUPPORTED_PROVIDERS.join(', ')}. Ensure you are passing an initialized client instance.`
    );
    this.name = 'UnsupportedLLMProviderError';
    this.provider = provider;
  }
}
