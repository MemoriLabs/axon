import type { CallContext, LLMRequest, LLMResponse } from "../types.js";
import { randomUUID } from "node:crypto";

export type KwargsToRequest = (kwargs: Record<string, unknown>) => LLMRequest;
export type RequestToKwargs = (request: LLMRequest) => Record<string, unknown>;
export type RawToResponse = (raw: unknown) => LLMResponse;
export type ApplyCanonicalToRaw = (raw: unknown, canonical: LLMResponse) => void;

export function createHookedCreate(opts: {
  create: (input: any, ...rest: any[]) => Promise<any>;
  axon: any;
  ctxMetadata: Record<string, unknown>;
  kwargsToRequest: KwargsToRequest;
  requestToKwargs: RequestToKwargs;
  rawToResponse: RawToResponse;
  applyCanonicalToRaw?: ApplyCanonicalToRaw;
}): (input: any, ...rest: any[]) => Promise<any> {
  return async (input: any, ...rest: any[]) => {
    const ctx: CallContext = {
      traceId: randomUUID(),
      startedAt: new Date(),
      metadata: { ...opts.ctxMetadata },
    };
    opts.axon._setLastCtx(ctx);

    let request = opts.kwargsToRequest(input ?? {});
    request = await opts.axon._run_before(request, ctx);

    const raw = await opts.create(opts.requestToKwargs(request), ...rest);

    let canonical = opts.rawToResponse(raw);
    canonical = await opts.axon._run_after(request, canonical, ctx);
    if (!canonical) {
      canonical = opts.rawToResponse(raw);
    }

    if (opts.applyCanonicalToRaw) {
      try {
        opts.applyCanonicalToRaw(raw, canonical);
      } catch {
        // ignore
      }
    }

    return raw;
  };
}
