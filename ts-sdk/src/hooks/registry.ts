import { AfterHook, BeforeHook, CallContext, LLMRequest, LLMResponse } from '../types/index.js';

export type HookType<P> = P extends 'before' ? BeforeHook : AfterHook;

/**
 * Manages a list of lifecycle hooks for a specific phase.
 *
 * @typeParam P - The lifecycle phase this registry manages ('before' or 'after').
 */
export class HookRegistry<P extends 'before' | 'after'> {
  private hooks: Array<HookType<P>> = [];

  constructor(private readonly phase: P) {}

  /**
   * Registers a new hook function.
   * Hooks are executed sequentially in the order they are registered.
   *
   * @param fn - The hook function to execute. It can optionally return a modified request/response, or a Promise resolving to one.
   * * @example
   * ```ts
   * // Before Hook Example:
   * axon.before.register((req, ctx) => {
   * console.log(`Sending prompt to ${req.model}`);
   * return req; // Optional: return modified request
   * });
   * * // After Hook Example:
   * axon.after.register((req, res, ctx) => {
   * console.log(`Received ${res.usage?.totalTokens} tokens`);
   * });
   * ```
   */
  register(fn: HookType<P>): void {
    this.hooks.push(fn);
  }

  /**
   * Executes all registered hooks in sequence.
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
