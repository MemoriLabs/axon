import type { CallContext } from './context.js';
import type { LLMRequest } from './request.js';
import type { LLMResponse } from './response.js';

export interface LLMAdapter {
  call: (request: LLMRequest, ctx: CallContext) => LLMResponse | Promise<LLMResponse>;
}
