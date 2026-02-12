import { Axon } from '../core/axon.js';
import { CallContext, createCallContext, LLMRequest, LLMResponse } from '../types/index.js';

export type KwargsToRequest<TInput> = (kwargs: TInput) => LLMRequest;
export type RequestToKwargs<TInput> = (request: LLMRequest) => TInput;
export type RawToResponse<TOutput> = (raw: TOutput) => LLMResponse;
export type ApplyCanonicalToRaw<TOutput> = (raw: TOutput, canonical: LLMResponse) => void;

/**
 * Wraps an async iterable (stream) to accumulate content and run after_call hooks
 * when the stream is exhausted.
 */
export class HookedStream<TChunk> implements AsyncIterable<TChunk> {
  private readonly iterator: AsyncIterator<TChunk>;
  private accumulatedContent: string[] = [];
  private hasFinished = false;

  constructor(
    private readonly stream: AsyncIterable<TChunk>,
    private readonly request: LLMRequest,
    private readonly ctx: CallContext,
    private readonly axon: Axon,
    private readonly chunkToText: (chunk: TChunk) => string | undefined,
    private readonly getFinalResponse: () => any
  ) {
    this.iterator = stream[Symbol.asyncIterator]();
  }

  [Symbol.asyncIterator](): AsyncIterator<TChunk> {
    return this;
  }

  async next(): Promise<IteratorResult<TChunk>> {
    const result = await this.iterator.next();

    if (result.done) {
      if (!this.hasFinished) {
        this.hasFinished = true;
        await this.finalize();
      }
      return result;
    }

    // Accumulate content for the canonical response
    const text = this.chunkToText(result.value);
    if (text) {
      this.accumulatedContent.push(text);
    }

    return result;
  }

  async return?(value?: any): Promise<IteratorResult<TChunk>> {
    if (!this.hasFinished) {
      this.hasFinished = true;
      await this.finalize();
    }
    return this.iterator.return ? this.iterator.return(value) : { done: true, value };
  }

  async throw?(e?: any): Promise<IteratorResult<TChunk>> {
    if (!this.hasFinished) {
      this.hasFinished = true;
      // Industry Standard: Attempt to log partial data even on crash.
      // We catch errors here to ensure the original error 'e' is what gets propagated,
      // not a secondary error from our logging logic.
      try {
        await this.finalize();
      } catch (finalizeError) {
        console.error(
          'Axon warning: Failed to finalize stream during error handling',
          finalizeError
        );
      }
    }
    return this.iterator.throw ? this.iterator.throw(e) : Promise.reject(e);
  }

  private async finalize() {
    const fullContent = this.accumulatedContent.join('');

    // In a real stream, we might not get usage/raw metadata easily until the end.
    // This depends on the provider's "final response" capability.
    let canonical: LLMResponse = {
      content: fullContent,
      raw: this.getFinalResponse(), // Pass raw stream object as "final" reference
    };

    // Run after hooks
    // Note: In streaming, we can't easily mutate the "past" stream,
    // so the return value of after hooks is mostly for side-effects (logging, storage).
    canonical = await this.axon.runAfter(this.request, canonical, this.ctx);
  }
}

/**
 * Proxy for intercepting LLM creation calls.
 */
export class HookedCreateProxy<TInput, TOutput> {
  constructor(
    private opts: {
      create: (input: TInput) => Promise<TOutput>;
      axon: Axon;
      ctxMetadata: Record<string, unknown>;
      kwargsToRequest: KwargsToRequest<TInput>;
      requestToKwargs: RequestToKwargs<TInput>;
      rawToResponse: RawToResponse<TOutput>;
      applyCanonicalToRaw?: ApplyCanonicalToRaw<TOutput>;
      chunkToText?: (chunk: any) => string | undefined;
    }
  ) {}

  async executeCreate(input: TInput): Promise<TOutput> {
    const ctx = createCallContext({ metadata: { ...this.opts.ctxMetadata } });
    this.opts.axon.setLastContext(ctx);

    let request = this.opts.kwargsToRequest(input);
    request = await this.opts.axon.runBefore(request, ctx);

    const rawArgs = this.opts.requestToKwargs(request);

    // Check if this is a streaming request
    // We assume the provider adapter knows how to flag this in the generic arguments
    const isStream = (rawArgs as any).stream === true;

    const raw = await this.opts.create(rawArgs);

    if (isStream && this.opts.chunkToText) {
      // Return a wrapped stream that handles the after_call hook logic
      return new HookedStream(
        raw as AsyncIterable<any>,
        request,
        ctx,
        this.opts.axon,
        this.opts.chunkToText,
        () => raw // Pass raw stream object as "final" reference
      ) as unknown as TOutput;
    }

    // Standard non-streaming flow
    let canonical = this.opts.rawToResponse(raw);
    canonical = await this.opts.axon.runAfter(request, canonical, ctx);

    // Apply any mutations back to the raw response object
    if (this.opts.applyCanonicalToRaw) {
      this.opts.applyCanonicalToRaw(raw, canonical);
    }

    return raw;
  }
}

export class CreateFacade {
  static wrap(resource: any, proxy: HookedCreateProxy<any, any>): any {
    return new Proxy(resource, {
      get(target, prop) {
        if (prop === 'create') return proxy.executeCreate.bind(proxy);
        return Reflect.get(target, prop);
      },
    });
  }
}
