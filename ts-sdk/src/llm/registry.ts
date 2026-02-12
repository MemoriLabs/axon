import type { Axon } from '../core/axon.js';
import { UnsupportedLLMProviderError } from '../errors/index.js';

export type Matcher = (client: any) => boolean;
export type Patcher = (client: any, axon: Axon) => void;

interface Registration {
  matcher: Matcher;
  patcher: Patcher;
}

/**
 * Registry for LLM provider integrations.
 * Allows users to register clients via `axon.llm.register(client)`.
 */
export class LLMRegistry {
  // Global list of supported providers (e.g. OpenAI)
  private static globalRegistrations: Registration[] = [];

  constructor(private readonly axon: Axon) {}

  /**
   * Register a client matcher and patcher globally.
   * This is used by provider packages to "plug in" to Axon.
   */
  static registerProvider(matcher: Matcher, patcher: Patcher): void {
    this.globalRegistrations.push({ matcher, patcher });
  }

  /**
   * Register a specific client instance with this Axon instance.
   * @param client The LLM client instance (e.g. new OpenAI())
   * @returns The Axon instance for chaining
   */
  register(client: unknown): Axon {
    for (const reg of LLMRegistry.globalRegistrations) {
      if (reg.matcher(client)) {
        reg.patcher(client, this.axon);
        return this.axon;
      }
    }

    // If no matcher found, throw error
    const clientName = (client as any)?.constructor?.name ?? typeof client;
    throw new UnsupportedLLMProviderError(clientName);
  }
}
