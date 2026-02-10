import type { CallContext, LLMRequest, LLMResponse } from "./types.js";

export interface LLMAdapter {
  call: (request: LLMRequest, ctx: CallContext) => LLMResponse | Promise<LLMResponse>;
}
