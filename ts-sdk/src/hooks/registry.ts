import { CallContext, LLMRequest, LLMResponse } from '../types/index.js';

// Define the shape of hook functions
type BeforeHook = (
  req: LLMRequest,
  ctx: CallContext
) => LLMRequest | Promise<LLMRequest> | undefined | Promise<undefined>;
type AfterHook = (
  req: LLMRequest,
  res: LLMResponse,
  ctx: CallContext
) => LLMResponse | Promise<LLMResponse> | undefined | Promise<undefined>;

type HookType<P> = P extends 'before' ? BeforeHook : AfterHook;

/**
 * Registry for lifecycle hooks.
 * Allows users to register functions via `axon.before.register(fn)`.
 */
export class HookRegistry<P extends 'before' | 'after'> {
  private hooks: Array<HookType<P>> = [];

  constructor(private readonly phase: P) {}

  /**
   * Register a hook function.
   * @param fn The function to run (can be async).
   */
  register(fn: HookType<P>): void {
    this.hooks.push(fn);
  }

  /**
   * Execute all registered hooks in sequence.
   * @internal
   */
  async execute(...args: unknown[]): Promise<unknown> {
    // Logic for 'before' phase: (req, ctx) -> req
    if (this.phase === 'before') {
      let currentReq = args[0] as LLMRequest;
      const ctx = args[1] as CallContext;

      for (const hook of this.hooks as BeforeHook[]) {
        const result = await hook(currentReq, ctx);
        if (result) currentReq = result;
      }
      return currentReq;
    }

    // Logic for 'after' phase: (req, res, ctx) -> res
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
