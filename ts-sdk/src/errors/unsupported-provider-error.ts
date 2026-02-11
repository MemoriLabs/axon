import { AxonError } from './axon-error.js';

export class UnsupportedLLMProviderError extends AxonError {
  public readonly provider: string;

  constructor(provider: string) {
    super(`Unsupported LLM provider: ${provider}`);
    this.name = 'UnsupportedLLMProviderError';
    this.provider = provider;
  }
}
