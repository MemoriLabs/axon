import type { CallContext, LLMRequest, LLMResponse } from "./types.js";

export interface Task {
  before_call?: (request: LLMRequest, ctx: CallContext) => LLMRequest | void | Promise<LLMRequest | void>;
  after_call?: (
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext,
  ) => LLMResponse | void | Promise<LLMResponse | void>;
}
