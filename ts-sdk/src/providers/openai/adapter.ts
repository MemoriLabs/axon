import type { CallContext, LLMRequest, LLMResponse } from "../../types.js";
import { contentFromOpenAI, messagesToOpenAIInput, usageFromOpenAI } from "./common.js";

function responsesArgs(request: LLMRequest, defaultModel?: string): Record<string, unknown> {
  const model = request.model ?? defaultModel;
  if (!model) throw new Error("No model provided (set request.model or defaultModel).");
  const params = { ...(request.params ?? {}) };
  delete (params as any).model;
  delete (params as any).input;
  return { model, input: messagesToOpenAIInput(request), ...params };
}

function chatArgs(request: LLMRequest, defaultModel?: string): Record<string, unknown> {
  const model = request.model ?? defaultModel;
  if (!model) throw new Error("No model provided (set request.model or defaultModel).");
  const params = { ...(request.params ?? {}) };
  delete (params as any).model;
  delete (params as any).messages;
  return { model, messages: messagesToOpenAIInput(request), ...params };
}

export class OpenAIResponsesAdapter {
  private readonly client: any;
  private readonly defaultModel?: string;

  constructor(client: any, opts?: { defaultModel?: string }) {
    this.client = client;
    this.defaultModel = opts?.defaultModel;
  }

  async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
    const raw = await this.client.responses.create(responsesArgs(request, this.defaultModel));
    return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
  }
}

export class OpenAIChatCompletionsAdapter {
  private readonly client: any;
  private readonly defaultModel?: string;

  constructor(client: any, opts?: { defaultModel?: string }) {
    this.client = client;
    this.defaultModel = opts?.defaultModel;
  }

  async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
    const raw = await this.client.chat.completions.create(chatArgs(request, this.defaultModel));
    return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
  }
}
