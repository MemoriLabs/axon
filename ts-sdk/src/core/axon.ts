import { AxonConfig } from '../types/config.js';
import { defaultAxonConfig } from './config.js';
import { HookRegistry } from '../hooks/registry.js';
import { LLMRegistry } from '../llm/registry.js';
import { CallContext, LLMRequest, LLMResponse } from '../types/index.js';

/**
 * Configuration options for initializing Axon.
 */
export interface AxonOpts {
  /** Runtime configuration overrides. */
  config?: AxonConfig;
}

/**
 * The central hub for the Axon SDK.
 *
 * This class orchestrates the lifecycle of LLM calls, managing:
 * - Provider registration (e.g., wrapping OpenAI).
 * - Hook execution (before/after calls).
 * - Configuration state.
 *
 * @example
 * ```ts
 * import { Axon } from 'axon';
 * import { OpenAI } from 'openai';
 *
 * const axon = new Axon({ config: { failFast: true } });
 * const client = new OpenAI();
 *
 * // 1. Register the client
 * axon.llm.register(client);
 *
 * // 2. Add hooks
 * axon.before.register((req) => {
 * console.log('Sending to:', req.model);
 * return req;
 * });
 *
 * // 3. Use client as normal
 * await client.chat.completions.create({ ... });
 * ```
 */
export class Axon {
  /** The active configuration for this instance. */
  public readonly config: Required<AxonConfig>;
  /** Registry for managing third-party LLM providers. */
  public readonly llm: LLMRegistry;
  /** Registry for hooks that run *before* the LLM call. */
  public readonly before: HookRegistry<'before'>;
  /** Registry for hooks that run *after* the LLM call. */
  public readonly after: HookRegistry<'after'>;

  /**
   * Creates a new Axon instance.
   *
   * @param opts - Initialization options, including configuration overrides.
   */
  constructor(opts: AxonOpts = {}) {
    this.config = { ...defaultAxonConfig, ...(opts.config ?? {}) };
    this.llm = new LLMRegistry(this);
    this.before = new HookRegistry('before');
    this.after = new HookRegistry('after');
  }

  /**
   * Executes the 'before' hook pipeline.
   * @internal
   */
  async runBefore(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    return (await this.before.execute(request, ctx)) as LLMRequest;
  }

  /**
   * Executes the 'after' hook pipeline.
   * @internal
   */
  async runAfter(
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ): Promise<LLMResponse> {
    return (await this.after.execute(request, response, ctx)) as LLMResponse;
  }
}
