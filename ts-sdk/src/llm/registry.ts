import type { Axon } from '../core/axon.js';
import { UnsupportedLLMProviderError } from '../errors/index.js';

export type ClientMatcher = (client: unknown) => boolean;
export type ClientPatcher = (client: unknown, axon: Axon) => void;

interface ProviderRegistration {
  matcher: ClientMatcher;
  patcher: ClientPatcher;
}

/**
 * Manages the detection and patching of third-party LLM clients.
 * This registry acts as the bridge between Axon and libraries like `openai`, `anthropic`, etc.
 */
export class LLMRegistry {
  private static globalRegistrations: ProviderRegistration[] = [];

  constructor(private readonly axon: Axon) {}

  /**
   * Registers a provider strategy globally.
   * This is typically called by provider implementation files (side-effect imports).
   *
   * @param matcher - A function that returns `true` if a client instance belongs to this provider.
   * @param patcher - A function that applies the Axon proxy to the client instance.
   */
  static registerProvider(matcher: ClientMatcher, patcher: ClientPatcher): void {
    this.globalRegistrations.push({ matcher, patcher });
  }

  /**
   * Patches a third-party client instance to route calls through Axon.
   *
   * @param client - The initialized LLM client instance.
   * @returns The Axon instance for method chaining.
   * @throws {UnsupportedLLMProviderError} If the provided client is not supported or recognized.
   * * @example
   * ```ts
   * const axon = new Axon();
   * const openai = new OpenAI({ apiKey: '...' });
   * * // Patch the client
   * axon.llm.register(openai);
   * ```
   */
  register(client: unknown): Axon {
    for (const reg of LLMRegistry.globalRegistrations) {
      if (reg.matcher(client)) {
        reg.patcher(client, this.axon);
        return this.axon;
      }
    }

    // Attempt to extract a meaningful name for the error message
    const clientName =
      (client as { constructor?: { name?: string } } | null)?.constructor?.name ?? typeof client;
    throw new UnsupportedLLMProviderError(clientName);
  }
}
