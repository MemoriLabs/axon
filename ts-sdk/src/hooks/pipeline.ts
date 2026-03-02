import { AfterHook, BeforeHook, CallContext, LLMRequest, LLMResponse } from '../types/index.js';

export type HookType<P> = P extends 'before' ? BeforeHook : AfterHook;

/**
 * Manages and executes a sequential pipeline of lifecycle hooks.
 * This is an internal execution engine for `axon.hooks`.
 *
 * @typeParam P - The lifecycle phase this pipeline manages ('before' or 'after').
 * @internal
 */
export class HookPipeline<P extends 'before' | 'after'> {
  private hooks: Array<HookType<P>> = [];

  constructor(private readonly phase: P) {}

  /**
   * Adds a new hook function to the pipeline.
   * Hooks are executed sequentially in the order they are added.
   *
   * @param fn - The hook function to add to the pipeline.
   */
  add(fn: HookType<P>): void {
    this.hooks.push(fn);
  }

  /**
   * Executes the pipeline of hooks in sequence.
   * @internal
   */
  async execute(...args: unknown[]): Promise<unknown> {
    if (this.phase === 'before') {
      let currentReq = args[0] as LLMRequest;
      const ctx = args[1] as CallContext;

      for (const hook of this.hooks as BeforeHook[]) {
        const result = await hook(currentReq, ctx);
        if (result) currentReq = result;
      }
      return currentReq;
    }

    if (this.phase === 'after') {
      const req = args[0] as LLMRequest;
      let currentRes = args[1] as LLMResponse;
      const ctx = args[2] as CallContext;

      for (const hook of this.hooks as AfterHook[]) {
        const result = await hook(req, currentRes, ctx);
        if (result) currentRes = result;
      }
      return currentRes;
    }
    return undefined;
  }
}
