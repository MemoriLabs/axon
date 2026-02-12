import { AxonHookError } from '../errors/hook-error.js';
import {
  AxonConfig,
  CallContext,
  LLMRequest,
  LLMResponse,
  Task,
} from '../types/index.js';
import { performance } from 'node:perf_hooks';
import { recordHookTiming } from './timing.js';
import { getTaskName } from './utils.js';

/**
 * HookRunner manages the execution of before/after hooks.
 * * @internal
 */
export class HookRunner {
  constructor(private readonly tasks: Task[], private readonly config: Required<AxonConfig>) {}

  /**
   * Run before_call hooks sequentially.
   */
  async runBefore(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    let currentRequest = request;

    for (const task of this.tasks) {
      const hook = task.before_call;
      if (!hook) continue;

      try {
        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(currentRequest, ctx);

        if (this.config.collectHookTimings) {
          const taskName = getTaskName(task);
          recordHookTiming(ctx, 'before_call', taskName, performance.now() - start);
        }

        if (updated !== undefined) {
          currentRequest = updated;
        }
      } catch (err) {
        if (this.config.failFast) throw err;
        throw new AxonHookError({
          hook: 'before_call',
          taskName: getTaskName(task),
          cause: err,
        });
      }
    }
    return currentRequest;
  }

  /**
   * Run after_call hooks sequentially or in background.
   */
  async runAfter(
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ): Promise<LLMResponse> {
    if (this.config.postCallBackground) {
      this.runAfterBackground(request, response, ctx);
      return response;
    }

    let currentResponse = response;

    for (const task of this.tasks) {
      const hook = task.after_call;
      if (!hook) continue;

      try {
        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(request, currentResponse, ctx);

        if (this.config.collectHookTimings) {
          const taskName = getTaskName(task);
          recordHookTiming(ctx, 'after_call', taskName, performance.now() - start);
        }

        if (updated !== undefined) {
          currentResponse = updated;
        }
      } catch (err) {
        if (this.config.failFast) throw err;
        throw new AxonHookError({
          hook: 'after_call',
          taskName: getTaskName(task),
          cause: err,
        });
      }
    }

    return currentResponse;
  }

  /**
   * Non-blocking background execution for after_call hooks.
   */
  private runAfterBackground(request: LLMRequest, response: LLMResponse, ctx: CallContext): void {
    const work = async () => {
      let currentResponse = response;
      for (const task of this.tasks) {
        const hook = task.after_call;
        if (!hook) continue;

        try {
          const start = this.config.collectHookTimings ? performance.now() : 0;
          const updated = await hook(request, currentResponse, ctx);

          if (this.config.collectHookTimings) {
            const taskName = getTaskName(task);
            recordHookTiming(ctx, 'after_call', taskName, performance.now() - start);
          }

          if (updated !== undefined) {
            currentResponse = updated;
          }
        } catch (err) {
          // In background mode, we can only re-throw to the event loop if failFast is true
          if (this.config.failFast) {
            queueMicrotask(() => { throw err; });
          }
        }
      }
    };

    queueMicrotask(() => { void work(); });
  }
}