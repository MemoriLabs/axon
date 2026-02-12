import { AxonConfig } from '../types/config.js';
import { defaultAxonConfig } from './config.js';
import { HookRegistry } from '../hooks/registry.js';
import { LLMRegistry } from '../llm/registry.js';
import { CallContext, LLMRequest, LLMResponse } from '../types/index.js';

/**
 * Options for creating an Axon instance.
 */
export interface AxonOpts {
  /**
   * Runtime configuration for Axon.
   */
  config?: AxonConfig;
}

/**
 * Axon - Universal LLM wrapper with fluent hook registration.
 * * @example
 * const axon = new Axon({
 * config: { failFast: true }
 * });
 * axon.before.register((req, ctx) => console.log('Sending:', req));
 * axon.llm.register(new OpenAI());
 */
export class Axon {
  public readonly config: Required<AxonConfig>;
  public readonly llm: LLMRegistry;
  public readonly before: HookRegistry<'before'>;
  public readonly after: HookRegistry<'after'>;

  // Track context for latency reporting
  private lastCtx?: CallContext;

  constructor(opts: AxonOpts = {}) {
    this.config = { ...defaultAxonConfig, ...(opts.config ?? {}) };

    // Initialize registries
    this.llm = new LLMRegistry(this);
    this.before = new HookRegistry('before');
    this.after = new HookRegistry('after');
  }

  // --- Internal Execution Methods ---

  /** @internal */
  setLastContext(ctx: CallContext) {
    this.lastCtx = ctx;
  }

  /** @internal */
  get lastContext() {
    return this.lastCtx;
  }

  /** @internal */
  async runBefore(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    return await this.before.execute(request, ctx);
  }

  /** @internal */
  async runAfter(
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ): Promise<LLMResponse> {
    return await this.after.execute(request, response, ctx);
  }
}
