import { AxonAdapterError } from '@/errors/adapter-error.js';
import { AxonHookError } from '@/errors/hook-error.js';
import { patchClient } from '@/hooks/registry.js';
import {
  AxonConfig,
  CallContext,
  createCallContext,
  LLMAdapter,
  LLMRequest,
  LLMResponse,
  Message,
  Task,
} from '@/types/index.js';
import { performance } from 'node:perf_hooks';
import { defaultAxonConfig } from './config.js';
import { recordHookTiming, getTimingsForPhase } from './timing.js';
import { getTaskName, getAdapterName } from './utils.js';

/**
 * Axon - A composable wrapper for LLM calls with before/after hooks.
 *
 * Axon provides a middleware pattern for LLM API calls, allowing you to:
 * - Transform requests before they're sent to the LLM
 * - Process responses after they're received
 * - Collect timing metrics
 * - Execute hooks in the background
 *
 * @example
 * ```typescript
 * import { Axon } from '@memori/axon';
 * import { OpenAI } from 'openai';
 *
 * const client = new OpenAI();
 *
 * const axon = new Axon({
 *   tasks: [
 *     {
 *       before_call: (req, ctx) => {
 *         console.log('Sending request:', req);
 *         return req;
 *       },
 *       after_call: (req, resp, ctx) => {
 *         console.log('Got response:', resp);
 *         return resp;
 *       }
 *     }
 *   ],
 *   config: {
 *     collectHookTimings: true,
 *     failFast: true,
 *   }
 * });
 *
 * await axon.register(client);
 *
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * axon.showLatency('before');
 * axon.showLatency('after');
 * ```
 */
export class Axon {
  private readonly adapter?: LLMAdapter;
  private readonly tasks: Task[];
  private readonly config: Required<AxonConfig>;
  private lastCtx?: CallContext;

  /**
   * Create a new Axon instance.
   *
   * @param opts - Configuration options
   * @param opts.adapter - Optional LLM adapter for direct calling
   * @param opts.tasks - Array of task objects with before_call/after_call hooks
   * @param opts.config - Runtime configuration (failFast, postCallBackground, etc.)
   *
   * @example
   * ```typescript
   * const axon = new Axon({
   *   tasks: [myTask1, myTask2],
   *   config: { failFast: true }
   * });
   * ```
   */
  constructor(opts?: { adapter?: LLMAdapter; tasks?: Task[]; config?: AxonConfig }) {
    this.adapter = opts?.adapter;
    this.tasks = opts?.tasks ? [...opts.tasks] : [];
    this.config = { ...defaultAxonConfig, ...(opts?.config ?? {}) };
  }

  /**
   * Register an LLM client to be wrapped by Axon's hooks.
   *
   * This patches the client's methods to run before/after hooks around API calls.
   * Supports OpenAI and other providers via the provider registry.
   *
   * @param client - The LLM client to register (e.g., OpenAI client instance)
   * @returns This Axon instance for chaining
   * @throws {UnsupportedLLMProviderError} If the client type is not recognized
   *
   * @example
   * ```typescript
   * import { OpenAI } from 'openai';
   *
   * const client = new OpenAI();
   * await axon.register(client);
   *
   * // Now all client.chat.completions.create() calls go through hooks
   * ```
   */
  async register(client: unknown): Promise<Axon> {
    await patchClient(this, client);
    return this;
  }

  /**
   * Set the last call context for latency inspection.
   *
   * @internal
   * This method is part of the provider integration API. It is called by
   * HookedCreateProxy to track the most recent call context for showLatency().
   *
   * @param ctx - The call context to store
   */
  setLastContext(ctx: CallContext): void {
    this.lastCtx = ctx;
  }

  /**
   * Run before_call hooks for all registered tasks.
   *
   * @internal
   * This method is part of the provider integration API. Provider adapters
   * should call this before executing the actual LLM API call.
   *
   * @param request - The canonical LLM request
   * @param ctx - The call context
   * @returns The potentially modified request after all hooks have run
   */
  async runBeforeHooks(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    return await this.runBefore(request, ctx);
  }

  /**
   * Run after_call hooks for all registered tasks.
   *
   * @internal
   * This method is part of the provider integration API. Provider adapters
   * should call this after receiving the LLM API response.
   *
   * @param request - The canonical LLM request that was sent
   * @param response - The canonical LLM response received
   * @param ctx - The call context
   * @returns The potentially modified response after all hooks have run
   */
  async runAfterHooks(
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ): Promise<LLMResponse> {
    return await this.runAfter(request, response, ctx);
  }

  /**
   * Display hook execution latency metrics.
   *
   * Shows timing information collected during the most recent LLM call.
   * Requires `collectHookTimings: true` in config.
   *
   * @param phase - Which phase to show timings for
   *   - 'before' or 'before_call': Timings for before_call hooks
   *   - 'after' or 'after_call': Timings for after_call hooks
   *
   * @example
   * ```typescript
   * const axon = new Axon({
   *   tasks: [myTask],
   *   config: { collectHookTimings: true }
   * });
   *
   * await axon.register(client);
   * await client.chat.completions.create({...});
   *
   * axon.showLatency('before');  // Shows before_call hook timings
   * axon.showLatency('after');   // Shows after_call hook timings
   * ```
   *
   * Output example:
   * ```
   * Axon latency (before_call): total=15.234ms
   * - MyTask: 12.456ms
   * - LoggingTask: 2.778ms
   * ```
   */
  showLatency(phase: 'before' | 'after' | 'before_call' | 'after_call'): void {
    // Type-safe phase mapping - TypeScript knows all keys are covered
    const phaseMap = {
      before: 'before_call',
      after: 'after_call',
      before_call: 'before_call',
      after_call: 'after_call',
    } as const;

    const normalizedPhase = phaseMap[phase];

    const ctx = this.lastCtx;
    if (!ctx) {
      console.log('Axon latency: no calls recorded yet.');
      return;
    }

    const timings = getTimingsForPhase(ctx, normalizedPhase);
    if (!timings) {
      console.log(
        `Axon latency (${normalizedPhase}): timings not collected (enable collectHookTimings=true).`
      );
      return;
    }

    console.log(`Axon latency (${normalizedPhase}): total=${timings.total.toFixed(3)}ms`);
    for (const item of timings.items) {
      console.log(`- ${item.task}: ${item.ms.toFixed(3)}ms`);
    }
  }

  /**
   * Run before_call hooks sequentially for all tasks.
   *
   * @private
   * @param request - The LLM request to process
   * @param ctx - The call context
   * @returns The potentially modified request
   * @throws {AxonHookError} If a hook fails and failFast is false
   */
  private async runBefore(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    for (const task of this.tasks) {
      const hook = task.before_call;
      if (!hook) continue;

      try {
        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(request, ctx);

        if (this.config.collectHookTimings) {
          const taskName = getTaskName(task);
          recordHookTiming(ctx, 'before_call', taskName, performance.now() - start);
        }

        // Fixed: Use !== undefined to match Python's "is not None" semantics
        if (updated !== undefined) {
          request = updated;
        }
      } catch (err) {
        if (this.config.failFast) throw err;

        const taskName = getTaskName(task);
        throw new AxonHookError({
          hook: 'before_call',
          taskName,
          cause: err,
        });
      }
    }
    return request;
  }

  /**
   * Run after_call hooks sequentially for all tasks.
   *
   * @private
   * @param request - The original LLM request
   * @param response - The LLM response to process
   * @param ctx - The call context
   * @returns The potentially modified response
   * @throws {AxonHookError} If a hook fails and failFast is false
   */
  private async runAfter(
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ): Promise<LLMResponse> {
    if (this.config.postCallBackground) {
      this.runAfterBackground(request, response, ctx);
      return response;
    }

    for (const task of this.tasks) {
      const hook = task.after_call;
      if (!hook) continue;

      try {
        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(request, response, ctx);

        if (this.config.collectHookTimings) {
          const taskName = getTaskName(task);
          recordHookTiming(ctx, 'after_call', taskName, performance.now() - start);
        }

        // Fixed: Use !== undefined to match Python's "is not None" semantics
        if (updated !== undefined) {
          response = updated;
        }
      } catch (err) {
        if (this.config.failFast) throw err;

        const taskName = getTaskName(task);
        throw new AxonHookError({
          hook: 'after_call',
          taskName,
          cause: err,
        });
      }
    }

    return response;
  }

  /**
   * Run after_call hooks in the background (non-blocking).
   *
   * @private
   * @param request - The original LLM request
   * @param response - The LLM response to process
   * @param ctx - The call context
   */
  private runAfterBackground(request: LLMRequest, response: LLMResponse, ctx: CallContext): void {
    const work = async () => {
      for (const task of this.tasks) {
        const hook = task.after_call;
        if (!hook) continue;

        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(request, response, ctx);

        if (this.config.collectHookTimings) {
          const taskName = getTaskName(task);
          recordHookTiming(ctx, 'after_call', taskName, performance.now() - start);
        }

        // Fixed: Use !== undefined to match Python's "is not None" semantics
        if (updated !== undefined) {
          response = updated;
        }
      }
    };

    queueMicrotask(() => {
      void work().catch((err: unknown) => {
        if (this.config.failFast) {
          queueMicrotask(() => {
            throw err;
          });
        }
      });
    });
  }

  /**
   * Make a direct LLM call using the configured adapter.
   *
   * This method is useful when you want to use Axon with a custom adapter
   * instead of registering a client.
   *
   * @param request - The canonical LLM request
   * @param ctx - Optional call context (will be auto-generated if not provided)
   * @returns The LLM response after processing through hooks
   * @throws {Error} If no adapter is configured
   * @throws {AxonAdapterError} If the adapter call fails and failFast is false
   *
   * @example
   * ```typescript
   * const axon = new Axon({
   *   adapter: myCustomAdapter,
   *   tasks: [loggingTask]
   * });
   *
   * const response = await axon.call({
   *   messages: [{ role: 'user', content: 'Hello!' }],
   *   model: 'gpt-4'
   * });
   * ```
   */
  async call(request: LLMRequest, ctx?: CallContext): Promise<LLMResponse> {
    if (!this.adapter) {
      throw new Error('No adapter configured. Use new Axon({ adapter }) or axon.register(client).');
    }

    const callCtx = ctx ?? createCallContext();
    this.setLastContext(callCtx);

    const updatedReq = await this.runBefore(request, callCtx);

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

    return await this.runAfter(updatedReq, resp, callCtx);
  }

  /**
   * Make an LLM call with a simple text message.
   *
   * Convenience method that wraps a text string in a user message and calls the LLM.
   * Requires a configured adapter.
   *
   * @param text - The text content to send
   * @param opts - Optional configuration
   * @param opts.model - The model to use (if not set in adapter)
   * @param opts.params - Additional parameters to pass to the LLM
   * @returns The LLM response
   *
   * @example
   * ```typescript
   * const response = await axon.callText('What is 2+2?', {
   *   model: 'gpt-4',
   *   params: { temperature: 0.7 }
   * });
   *
   * console.log(response.content); // "2+2 equals 4"
   * ```
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
