import { HookPipeline } from '../hooks/pipeline.js';
import { LLMRegistry } from '../llm/registry.js';
import { AfterHook, BeforeHook, CallContext, LLMRequest, LLMResponse } from '../types/index.js';

/**
 * The central hub for the Axon SDK.
 *
 * This class orchestrates the lifecycle of LLM calls, managing:
 * - Provider registration (e.g., wrapping OpenAI).
 * - Hook execution (before/after calls).
 * @example
 * ```ts
 * import { Axon } from '@memorilabs/axon';
 * import { OpenAI } from 'openai';
 *
 * const axon = new Axon();
 * const client = new OpenAI();
 *
 * // 1. Register the client
 * axon.llm.register(client);
 *
 * // 2. Add hooks
 * axon.hook.before((req, ctx) => {
 * console.log(`[${ctx.traceId}] Sending to: ${req.model}`);
 * return req;
 * });
 *
 * // 3. Use client as normal
 * await client.chat.completions.create({ ... });
 * ```
 */
export class Axon {
  /** Registry for managing third-party LLM providers. */
  public readonly llm: LLMRegistry;

  /** * Namespace for registering LLM lifecycle hooks.
   * Hooks allow you to intercept, observe, and modify requests and responses.
   */
  public readonly hook: {
    /**
     * Registers a hook function to run *before* the LLM call is executed.
     * Hooks are executed sequentially in the order they are added.
     *
     * @param fn - The hook function to execute. It can optionally return a modified request, or a Promise resolving to one.
     * @example
     * ```ts
     * axon.hook.before((req, ctx) => {
     * console.log(`[${ctx.traceId}] Sending prompt to ${req.model}`);
     * return req;
     * });
     * ```
     */
    before: (fn: BeforeHook) => void;

    /**
     * Registers a hook function to run *after* the LLM call completes or streams.
     * Hooks are executed sequentially in the order they are added.
     *
     * @param fn - The hook function to execute. It can optionally return a modified response, or a Promise resolving to one.
     * @example
     * ```ts
     * axon.hook.after((req, res, ctx) => {
     * console.log(`[${ctx.traceId}] Received ${res.usage?.totalTokens} tokens`);
     * console.log(`[${ctx.traceId}] AI Response: ${res.content}`);
     * });
     * ```
     */
    after: (fn: AfterHook) => void;
  };

  private readonly beforePipeline: HookPipeline<'before'>;
  private readonly afterPipeline: HookPipeline<'after'>;

  /**
   * Creates a new Axon instance.
   */
  constructor() {
    this.llm = new LLMRegistry(this);
    this.beforePipeline = new HookPipeline('before');
    this.afterPipeline = new HookPipeline('after');

    this.hook = {
      before: (fn: BeforeHook) => {
        this.beforePipeline.add(fn);
      },
      after: (fn: AfterHook) => {
        this.afterPipeline.add(fn);
      },
    };
  }

  /**
   * Executes the 'before' hook pipeline.
   * @internal
   */
  async runBefore(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    return (await this.beforePipeline.execute(request, ctx)) as LLMRequest;
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
    return (await this.afterPipeline.execute(request, response, ctx)) as LLMResponse;
  }
}
