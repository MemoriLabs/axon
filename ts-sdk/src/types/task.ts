import { CallContext } from './context.js';
import { LLMRequest } from './request.js';
import { LLMResponse } from './response.js';

export type MaybePromise<T> = T | Promise<T>;

export interface Task {
  before_call?: (request: LLMRequest, ctx: CallContext) => MaybePromise<LLMRequest | undefined>;
  after_call?: (
    request: LLMRequest,
    response: LLMResponse,
    ctx: CallContext
  ) => MaybePromise<LLMResponse | undefined>;
}
