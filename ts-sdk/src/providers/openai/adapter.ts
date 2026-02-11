import { CallContext } from '@/types/context.js';
import { LLMRequest } from '@/types/request.js';
import { LLMResponse } from '@/types/response.js';
import { messagesToOpenAIInput, contentFromOpenAI, usageFromOpenAI } from './common.js';

interface OpenAIResponsesClient {
  responses: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

interface OpenAIChatClient {
  chat: {
    completions: {
      create: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };
}

function isOpenAIResponsesClient(client: unknown): client is OpenAIResponsesClient {
  if (!client || typeof client !== 'object' || !('responses' in client)) return false;
  const responses = (client as { responses?: { create?: unknown } }).responses;
  return typeof responses?.create === 'function';
}

function isOpenAIChatClient(client: unknown): client is OpenAIChatClient {
  if (!client || typeof client !== 'object' || !('chat' in client)) return false;
  const chat = (client as { chat?: { completions?: { create?: unknown } } }).chat;
  return typeof chat?.completions?.create === 'function';
}

function responsesArgs(request: LLMRequest, defaultModel?: string): Record<string, unknown> {
  const model = request.model ?? defaultModel;
  if (!model) throw new Error('No model provided (set request.model or defaultModel).');
  const params = { ...(request.params ?? {}) };
  delete params.model;
  delete params.input;
  return { model, input: messagesToOpenAIInput(request), ...params };
}

function chatArgs(request: LLMRequest, defaultModel?: string): Record<string, unknown> {
  const model = request.model ?? defaultModel;
  if (!model) throw new Error('No model provided (set request.model or defaultModel).');
  const params = { ...(request.params ?? {}) };
  delete params.model;
  delete params.messages;
  return { model, messages: messagesToOpenAIInput(request), ...params };
}

export class OpenAIResponsesAdapter {
  private readonly client: OpenAIResponsesClient;
  private readonly defaultModel?: string;

  constructor(client: unknown, opts?: { defaultModel?: string }) {
    if (!isOpenAIResponsesClient(client)) {
      throw new Error('Client does not have responses API');
    }
    this.client = client;
    this.defaultModel = opts?.defaultModel;
  }

  async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
    const raw = await this.client.responses.create(responsesArgs(request, this.defaultModel));
    return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
  }
}

export class OpenAIChatCompletionsAdapter {
  private readonly client: OpenAIChatClient;
  private readonly defaultModel?: string;

  constructor(client: unknown, opts?: { defaultModel?: string }) {
    if (!isOpenAIChatClient(client)) {
      throw new Error('Client does not have chat.completions API');
    }
    this.client = client;
    this.defaultModel = opts?.defaultModel;
  }

  async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
    const raw = await this.client.chat.completions.create(chatArgs(request, this.defaultModel));
    return { content: contentFromOpenAI(raw), usage: usageFromOpenAI(raw), raw };
  }
}
