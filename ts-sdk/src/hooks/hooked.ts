import { Axon } from '../core/axon.js';
import { createCallContext, LLMRequest, LLMResponse } from '../types/index.js';

/**
 * Converter function types for transforming between provider-specific and canonical formats.
 *
 * @internal
 * These types are part of the provider integration API.
 */
export type KwargsToRequest<TInput> = (kwargs: TInput) => LLMRequest;
export type RequestToKwargs<TInput> = (request: LLMRequest) => TInput;
export type RawToResponse<TOutput> = (raw: TOutput) => LLMResponse;
export type ApplyCanonicalToRaw<TOutput> = (raw: TOutput, canonical: LLMResponse) => void;

/**
 * HookedCreateProxy handles interception of LLM client method calls.
 *
 * This class encapsulates the logic for running before/after hooks around
 * LLM provider API calls, converting between provider-specific formats and
 * Axon's canonical request/response types.
 *
 * @internal
 */
export class HookedCreateProxy<TInput = unknown, TOutput = unknown> {
  private readonly create: (input: TInput) => Promise<TOutput>;
  private readonly axon: Axon;
  private readonly ctxMetadata: Record<string, unknown>;
  private readonly kwargsToRequest: KwargsToRequest<TInput>;
  private readonly requestToKwargs: RequestToKwargs<TInput>;
  private readonly rawToResponse: RawToResponse<TOutput>;
  private readonly applyCanonicalToRaw?: ApplyCanonicalToRaw<TOutput>;

  constructor(opts: {
    create: (input: TInput) => Promise<TOutput>;
    axon: Axon;
    ctxMetadata: Record<string, unknown>;
    kwargsToRequest: KwargsToRequest<TInput>;
    requestToKwargs: RequestToKwargs<TInput>;
    rawToResponse: RawToResponse<TOutput>;
    applyCanonicalToRaw?: ApplyCanonicalToRaw<TOutput>;
  }) {
    this.create = opts.create;
    this.axon = opts.axon;
    this.ctxMetadata = opts.ctxMetadata;
    this.kwargsToRequest = opts.kwargsToRequest;
    this.requestToKwargs = opts.requestToKwargs;
    this.rawToResponse = opts.rawToResponse;
    this.applyCanonicalToRaw = opts.applyCanonicalToRaw;
  }

  /**
   * Execute the hooked create method.
   * This runs before hooks, calls the underlying LLM API, then runs after hooks.
   */
  async executeCreate(input: TInput): Promise<TOutput> {
    // Create context for this call
    const ctx = createCallContext({ metadata: { ...this.ctxMetadata } });
    this.axon.setLastContext(ctx);

    // Extract canonical request from provider-specific input
    let request = this.kwargsToRequest(input);

    // Run before_call hooks
    request = await this.axon.runBeforeHooks(request, ctx);

    // Execute the actual LLM call with modified request
    const raw = await this.create(this.requestToKwargs(request));

    // Extract canonical response from provider-specific output
    let canonical = this.rawToResponse(raw);

    // Run after_call hooks
    canonical = await this.axon.runAfterHooks(request, canonical, ctx);

    // Optionally apply canonical changes back to raw response
    if (this.applyCanonicalToRaw) {
      try {
        this.applyCanonicalToRaw(raw, canonical);
      } catch {
        // Silently ignore mutations that fail
      }
    }

    return raw;
  }
}

/**
 * CreateFacade wraps an LLM client resource and intercepts only the `create` method.
 *
 * @internal
 */
export class CreateFacade {
  private constructor() {}

  /**
   * Wrap a resource with a facade that intercepts the `create` method.
   */
  static wrap(resource: unknown, hookedProxy: HookedCreateProxy<any, any>): unknown {
    const facade = {
      __axon_patched__: true,
      __axon_original__: resource,
      create: hookedProxy.executeCreate.bind(hookedProxy),
    };

    return new Proxy(facade, {
      get(target, prop) {
        if (prop === '__axon_patched__') return target.__axon_patched__;
        if (prop === '__axon_original__') return target.__axon_original__;
        if (prop === 'create') return target.create;

        if (typeof prop === 'string' && resource && typeof resource === 'object') {
          return (resource as Record<string, unknown>)[prop];
        }
        return undefined;
      },
      set(target, prop, value) {
        if (typeof prop === 'string' && resource && typeof resource === 'object') {
          (resource as Record<string, unknown>)[prop] = value;
        }
        return true;
      },
    });
  }
}