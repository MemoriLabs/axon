import { Axon } from '../core/axon.js';
import { CallContext, createCallContext, LLMRequest, LLMResponse } from '../types/index.js';

export type ArgsToRequest<TInput> = (args: TInput) => LLMRequest;
export type RequestToArgs<TInput> = (request: LLMRequest) => TInput;
export type RawToResponse<TOutput> = (raw: TOutput) => LLMResponse;
export type ApplyCanonicalToRaw<TOutput> = (raw: TOutput, canonical: LLMResponse) => void;

function isStreamArgs(args: unknown): args is { stream: boolean } {
  return (
    typeof args === 'object' &&
    args !== null &&
    'stream' in args &&
    (args as { stream: boolean }).stream
  );
}

/**
 * Wraps an async iterable to handle hook finalization.
 */
export class HookedStream<TChunk> implements AsyncIterable<TChunk> {
  private accumulatedContent: string[] = [];
  private hasFinished = false;

  constructor(
    private readonly stream: AsyncIterable<TChunk>,
    private readonly request: LLMRequest,
    private readonly ctx: CallContext,
    private readonly axon: Axon,
    private readonly chunkToText: (chunk: unknown) => string | undefined,
    private readonly getFinalResponse: () => unknown
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<TChunk> {
    try {
      for await (const value of this.stream) {
        const text = this.chunkToText(value);
        if (text) {
          this.accumulatedContent.push(text);
        }
        yield value as TChunk;
      }
    } finally {
      if (!this.hasFinished) {
        this.hasFinished = true;
        await this.finalize();
      }
    }
  }

  private async finalize() {
    const canonical: LLMResponse = {
      content: this.accumulatedContent.join(''),
      raw: this.getFinalResponse(),
    };
    await this.axon.runAfter(this.request, canonical, this.ctx);
  }
}

export class HookedCreateProxy<TInput, TOutput> {
  constructor(
    private opts: {
      create: (input: TInput) => Promise<TOutput>;
      axon: Axon;
      ctxMetadata: Record<string, unknown>;
      argsToRequest: ArgsToRequest<TInput>;
      requestToArgs: RequestToArgs<TInput>;
      rawToResponse: RawToResponse<TOutput>;
      applyCanonicalToRaw?: ApplyCanonicalToRaw<TOutput>;
      chunkToText?: (chunk: unknown) => string | undefined;
    }
  ) {}

  async executeCreate(input: TInput): Promise<TOutput> {
    const ctx = createCallContext({ metadata: { ...this.opts.ctxMetadata } });

    let request = this.opts.argsToRequest(input);
    request = await this.opts.axon.runBefore(request, ctx);

    const rawArgs = this.opts.requestToArgs(request);
    const isStream = isStreamArgs(rawArgs);

    const raw = await this.opts.create(rawArgs);

    if (isStream && this.opts.chunkToText) {
      return new HookedStream(
        raw as AsyncIterable<unknown>,
        request,
        ctx,
        this.opts.axon,
        this.opts.chunkToText,
        () => raw
      ) as unknown as TOutput;
    }

    let canonical = this.opts.rawToResponse(raw);
    canonical = await this.opts.axon.runAfter(request, canonical, ctx);

    if (this.opts.applyCanonicalToRaw) {
      this.opts.applyCanonicalToRaw(raw, canonical);
    }

    return raw;
  }
}

export class CreateFacade {
  /**
   * Returns a standard function wrapper instead of a Proxy.
   */
  static wrap<TInput, TOutput>(
    originalFn: (input: TInput) => Promise<TOutput>,
    proxy: HookedCreateProxy<TInput, TOutput>
  ): (input: TInput) => Promise<TOutput> {
    const wrapped = (input: TInput) => proxy.executeCreate(input);

    // Copy properties (like .bind or OpenAI specific meta) to the new function
    return Object.assign(wrapped, originalFn);
  }
}
