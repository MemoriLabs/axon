import { performance } from "node:perf_hooks";

import type { LLMAdapter } from "./adapters.js";
import { defaultAxonConfig, type AxonConfig } from "./config.js";
import { AxonAdapterError, AxonHookError } from "./errors.js";
import type { Task } from "./tasks.js";
import { patchClient } from "./registry.js";
import type { CallContext, LLMRequest, LLMResponse, Message } from "./types.js";
import { createCallContext } from "./types.js";

function timingsBucket(ctx: CallContext): Record<string, any> {
  const meta = (ctx.metadata.axon ??= {}) as Record<string, unknown>;
  return ((meta.hookTimingsMs ??= {}) as Record<string, any>);
}

function recordHookTiming(ctx: CallContext, phase: string, taskName: string, ms: number): void {
  const bucket = timingsBucket(ctx);
  const arr = (bucket[phase] ??= []) as Array<{ task: string; ms: number }>;
  arr.push({ task: taskName, ms });
  bucket[`${phase}_total`] = (bucket[`${phase}_total`] ?? 0) + ms;
}

export class Axon {
  private readonly adapter?: LLMAdapter;
  private readonly tasks: Task[];
  private readonly config: Required<AxonConfig>;
  private lastCtx?: CallContext;

  constructor(opts?: { adapter?: LLMAdapter; tasks?: Task[]; config?: AxonConfig }) {
    this.adapter = opts?.adapter;
    this.tasks = opts?.tasks ? [...opts.tasks] : [];
    this.config = { ...defaultAxonConfig, ...(opts?.config ?? {}) };
  }

  async register(client: any): Promise<Axon> {
    await patchClient(this, client);
    return this;
  }

  _setLastCtx(ctx: CallContext): void {
    this.lastCtx = ctx;
  }

  async _run_before(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    return await this.runBefore(request, ctx);
  }

  async _run_after(request: LLMRequest, response: LLMResponse, ctx: CallContext): Promise<LLMResponse> {
    return await this.runAfter(request, response, ctx);
  }

  showLatency(phase: "before" | "after" | "before_call" | "after_call"): void {
    const map: Record<string, string> = {
      before: "before_call",
      after: "after_call",
      before_call: "before_call",
      after_call: "after_call",
    };
    const key = map[phase];
    const ctx = this.lastCtx;
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.log("Axon latency: no calls recorded yet.");
      return;
    }

    const timings = (ctx.metadata.axon as any)?.hookTimingsMs ?? {};
    const total = timings[`${key}_total`];
    const items = timings[key] ?? [];

    if (total === undefined) {
      // eslint-disable-next-line no-console
      console.log(`Axon latency (${key}): timings not collected (enable collectHookTimings=true).`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`Axon latency (${key}): total=${Number(total).toFixed(3)}ms`);
    for (const item of items) {
      // eslint-disable-next-line no-console
      console.log(`- ${item.task ?? "<unknown>"}: ${Number(item.ms ?? 0).toFixed(3)}ms`);
    }
  }

  private async runBefore(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
    for (const task of this.tasks) {
      const hook = task.before_call;
      if (!hook) continue;
      try {
        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(request, ctx);
        if (this.config.collectHookTimings) {
          recordHookTiming(ctx, "before_call", task.constructor?.name ?? "<anonymous>", performance.now() - start);
        }
        if (updated) request = updated;
      } catch (err) {
        if (this.config.failFast) throw err;
        throw new AxonHookError({
          hook: "before_call",
          taskName: task.constructor?.name ?? "<anonymous>",
          cause: err,
        });
      }
    }
    return request;
  }

  private async runAfter(request: LLMRequest, response: LLMResponse, ctx: CallContext): Promise<LLMResponse> {
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
          recordHookTiming(ctx, "after_call", task.constructor?.name ?? "<anonymous>", performance.now() - start);
        }
        if (updated) response = updated;
      } catch (err) {
        if (this.config.failFast) throw err;
        throw new AxonHookError({
          hook: "after_call",
          taskName: task.constructor?.name ?? "<anonymous>",
          cause: err,
        });
      }
    }

    return response;
  }

  private runAfterBackground(request: LLMRequest, response: LLMResponse, ctx: CallContext): void {
    const work = async () => {
      for (const task of this.tasks) {
        const hook = task.after_call;
        if (!hook) continue;
        const start = this.config.collectHookTimings ? performance.now() : 0;
        const updated = await hook(request, response, ctx);
        if (this.config.collectHookTimings) {
          recordHookTiming(ctx, "after_call", task.constructor?.name ?? "<anonymous>", performance.now() - start);
        }
        if (updated) response = updated;
      }
    };

    queueMicrotask(() => {
      // intentionally detached
      void work().catch((err) => {
        if (this.config.failFast) {
          queueMicrotask(() => {
            throw err;
          });
        }
      });
    });
  }

  async call(request: LLMRequest, ctx?: CallContext): Promise<LLMResponse> {
    if (!this.adapter) {
      throw new Error('No adapter configured. Use new Axon({ adapter }) or axon.register(client).');
    }

    const callCtx = ctx ?? createCallContext();
    this._setLastCtx(callCtx);

    const updatedReq = await this.runBefore(request, callCtx);

    let resp: LLMResponse;
    try {
      resp = await this.adapter.call(updatedReq, callCtx);
    } catch (err) {
      if (this.config.failFast) throw err;
      throw new AxonAdapterError({ adapterName: this.adapter.constructor?.name ?? "<anonymous>", cause: err });
    }

    return await this.runAfter(updatedReq, resp, callCtx);
  }

  async callText(text: string, opts?: { model?: string; params?: Record<string, unknown> }): Promise<LLMResponse> {
    const msg: Message = { role: "user", content: text };
    return await this.call({
      messages: [msg],
      model: opts?.model,
      params: opts?.params,
    });
  }
}
