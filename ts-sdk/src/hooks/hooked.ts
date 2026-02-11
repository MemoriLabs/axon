import { Axon } from '@/core/axon.js';
import { createCallContext, LLMRequest, LLMResponse } from '@/types/index.js';

/**
 * Converter function types for transforming between provider-specific and canonical formats.
 *
 * @internal
 * These types are part of the provider integration API.
 */
export type KwargsToRequest = (kwargs: Record<string, unknown>) => LLMRequest;
export type RequestToKwargs = (request: LLMRequest) => Record<string, unknown>;
export type RawToResponse = (raw: unknown) => LLMResponse;
export type ApplyCanonicalToRaw = (raw: unknown, canonical: LLMResponse) => void;

/**
 * HookedCreateProxy handles interception of LLM client method calls.
 *
 * This class encapsulates the logic for running before/after hooks around
 * LLM provider API calls, converting between provider-specific formats and
 * Axon's canonical request/response types.
 *
 * @internal
 * This class is part of the provider integration API and is not covered
 * by semantic versioning. It may change in minor or patch releases.
 * Only use this if you're implementing a custom LLM provider integration.
 *
 * @example
 * ```typescript
 * const proxy = new HookedCreateProxy({
 *   create: originalCreateFn,
 *   axon: axonInstance,
 *   ctxMetadata: { provider: 'openai', method: 'chat.completions.create' },
 *   kwargsToRequest: (kwargs) => ({ messages: [...], model: ... }),
 *   requestToKwargs: (req) => ({ messages: [...], model: ... }),
 *   rawToResponse: (raw) => ({ content: ..., usage: ... }),
 * });
 * ```
 */
export class HookedCreateProxy<TRaw = unknown> {
  private readonly create: (input: unknown) => Promise<TRaw>;
  private readonly axon: Axon;
  private readonly ctxMetadata: Record<string, unknown>;
  private readonly kwargsToRequest: KwargsToRequest;
  private readonly requestToKwargs: RequestToKwargs;
  private readonly rawToResponse: RawToResponse;
  private readonly applyCanonicalToRaw?: ApplyCanonicalToRaw;

  constructor(opts: {
    create: (input: unknown) => Promise<TRaw>;
    axon: Axon;
    ctxMetadata: Record<string, unknown>;
    kwargsToRequest: KwargsToRequest;
    requestToKwargs: RequestToKwargs;
    rawToResponse: RawToResponse;
    applyCanonicalToRaw?: ApplyCanonicalToRaw;
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
  async executeCreate(input: unknown): Promise<TRaw> {
    // Create context for this call
    const ctx = createCallContext({ metadata: { ...this.ctxMetadata } });
    this.axon.setLastContext(ctx);

    // Extract canonical request from provider-specific input
    const inputKwargs = (input as Record<string, unknown> | null | undefined) || {};
    let request = this.kwargsToRequest(inputKwargs);

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
 * This facade allows Axon to hook into LLM calls without mutating the original
 * client object. All other properties are passed through to the original resource.
 *
 * @internal
 * This class is part of the provider integration API and is not covered
 * by semantic versioning.
 *
 * @example
 * ```typescript
 * const proxy = new HookedCreateProxy({ ... });
 * const facade = CreateFacade.wrap(client.responses, proxy);
 * client.responses = facade; // Replace with facade
 * ```
 */
export class CreateFacade {
  private constructor() {
    // Private constructor - use static wrap() method
  }

  /**
   * Wrap a resource with a facade that intercepts the `create` method.
   */
  static wrap(resource: unknown, hookedProxy: HookedCreateProxy): unknown {
    const facade = {
      __axon_patched__: true,
      __axon_original__: resource,
      create: hookedProxy.executeCreate.bind(hookedProxy),
    };

    // Use Proxy to pass through all other properties to the original resource
    return new Proxy(facade, {
      get(target, prop) {
        // If accessing one of our special properties, return them
        if (prop === '__axon_patched__') return target.__axon_patched__;
        if (prop === '__axon_original__') return target.__axon_original__;
        if (prop === 'create') return target.create;

        // Otherwise pass through to the original resource
        if (typeof prop === 'string' && resource && typeof resource === 'object') {
          return (resource as Record<string, unknown>)[prop];
        }
        return undefined;
      },
      set(target, prop, value) {
        // Pass through sets to the original resource
        if (typeof prop === 'string' && resource && typeof resource === 'object') {
          (resource as Record<string, unknown>)[prop] = value;
        }
        return true;
      },
    });
  }
}
