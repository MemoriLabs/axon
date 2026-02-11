import { AxonAdapterError } from '../errors/adapter-error.js';
import { patchClient } from '../hooks/registry.js';
import {
  AxonConfig,
  CallContext,
  createCallContext,
  LLMAdapter,
  LLMRequest,
  LLMResponse,
  Message,
  Task,
} from '../types/index.js';
import { defaultAxonConfig } from './config.js';
import { getAdapterName } from './utils.js';
import { HookRunner } from './middleware.js';
import { AxonMonitor } from './monitor.js';

/**
 * Axon - A composable wrapper for LLM calls with before/after hooks.
 *
 * Axon provides a middleware pattern for LLM API calls, allowing you to:
 * - Transform requests before they're sent to the LLM
 * - Process responses after they're received
 * - Collect timing metrics
 * - Execute hooks in the background
 */
export class Axon {
  private readonly adapter?: LLMAdapter;
  private readonly config: Required<AxonConfig>;
  private readonly runner: HookRunner;
  private lastCtx?: CallContext;

  /**
   * Create a new Axon instance.
   *
   * @param opts - Configuration options
   * @param opts.adapter - Optional LLM adapter for direct calling
   * @param opts.tasks - Array of task objects with before_call/after_call hooks
   * @param opts.config - Runtime configuration (failFast, postCallBackground, etc.)
   */
  constructor(opts?: { adapter?: LLMAdapter; tasks?: Task[]; config?: AxonConfig }) {
    this.adapter = opts?.adapter;
    const tasks = opts?.tasks ? [...opts.tasks] : [];
    this.config = { ...defaultAxonConfig, ...(opts?.config ?? {}) };
    
    // Decoupled hook execution logic
    this.runner = new HookRunner(tasks, this.config);
  }

  /**
   * Register an LLM client to be wrapped by Axon's hooks.
   */
  async register(client: unknown): Promise<Axon> {
    await patchClient(this, client);
    return this;
  }

  /**
   * Get the context of the most recent LLM call.
   */
  get lastContext(): CallContext | undefined {
    return this.lastCtx;
  }

  /**
   * Set the last call context for latency inspection.
   * * @internal
   */
  setLastContext(ctx: CallContext): void {
    this.lastCtx = ctx;
  }

  /**
   * Run before_call hooks for all registered tasks.
   *
   * @internal
   */
  async runBeforeHooks(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    return await this.runner.runBefore(request, ctx);
  }

  /**
   * Run after_call hooks for all registered tasks.
   *
   * @internal
   */
  async runAfterHooks(
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ): Promise<LLMResponse> {
    return await this.runner.runAfter(request, response, ctx);
  }

  /**
   * Display hook execution latency metrics.
   * * Delegates the reporting logic to the AxonMonitor utility.
   */
  showLatency(phase: 'before' | 'after' | 'before_call' | 'after_call'): void {
    AxonMonitor.logLatency(this.lastCtx, phase);
  }

  /**
   * Make a direct LLM call using the configured adapter.
   */
  async call(request: LLMRequest, ctx?: CallContext): Promise<LLMResponse> {
    if (!this.adapter) {
      throw new Error('No adapter configured. Use new Axon({ adapter }) or axon.register(client).');
    }

    const callCtx = ctx ?? createCallContext();
    this.setLastContext(callCtx);

    const updatedReq = await this.runner.runBefore(request, callCtx);

    let resp: LLMResponse;
    try {
      resp = await this.adapter.call(updatedReq, callCtx);
    } catch (err) {
      if (this.config.failFast) throw err;

      const adapterName = getAdapterName(this.adapter);
      throw new AxonAdapterError({
        adapterName,
        cause: err,
      });
    }

    return await this.runner.runAfter(updatedReq, resp, callCtx);
  }

  /**
   * Make an LLM call with a simple text message.
   */
  async callText(
    text: string,
    opts?: { model?: string; params?: Record<string, unknown> }
  ): Promise<LLMResponse> {
    const msg: Message = { role: 'user', content: text };
    return await this.call({
      messages: [msg],
      model: opts?.model,
      params: opts?.params,
    });
  }
}