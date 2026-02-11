import { Message } from '@/types/message.js';
import { LLMRequest } from '@/types/request.js';
import { Usage } from '@/types/response.js';

type OpenAIMessageLike = {
  role?: unknown;
  content?: unknown;
};

type OpenAIUsageLike = {
  input_tokens?: unknown;
  prompt_tokens?: unknown;
  output_tokens?: unknown;
  completion_tokens?: unknown;
  total_tokens?: unknown;
};

type OpenAIRespWithUsage = {
  usage?: OpenAIUsageLike;
};

type OpenAIChoiceMessageLike = {
  content?: unknown;
};

type OpenAIChoiceLike = {
  message?: OpenAIChoiceMessageLike;
};

type OpenAIRespWithChoices = {
  choices?: unknown;
};

type OpenAIContentItemLike = {
  text?: unknown;
};

type OpenAIOutputItemLike = {
  content?: unknown;
};

type OpenAIRespWithOutput = {
  output?: unknown;
};

type OpenAIRespWithOutputText = {
  output_text?: unknown;
};

type OpenAIResponseLike = OpenAIRespWithUsage &
  OpenAIRespWithChoices &
  OpenAIRespWithOutput &
  OpenAIRespWithOutputText;

export function openaiInputToMessages(input: unknown): Message[] {
  if (typeof input === 'string') return [{ role: 'user', content: input }];
  if (!Array.isArray(input)) {
    throw new TypeError('OpenAI input must be a string or a list of {role, content} objects.');
  }

  return input.map((rawItem) => {
    const item = rawItem as OpenAIMessageLike;
    const role = item.role;
    const content = item.content;
    if (typeof role !== 'string' || content === undefined) {
      throw new TypeError('OpenAI input objects must include role and content.');
    }
    return { role, content } as Message;
  });
}

export function messagesToOpenAIInput(
  request: LLMRequest
): Array<{ role: string; content: string }> {
  return request.messages.map((m) => ({ role: m.role, content: m.content }));
}

export function usageFromOpenAI(resp: unknown): Usage | undefined {
  if (!resp || typeof resp !== 'object') return undefined;
  const withUsage = resp as OpenAIRespWithUsage;
  const usage = withUsage.usage;
  if (!usage || typeof usage !== 'object') return undefined;

  const usageObj = usage;

  const promptTokensRaw = usageObj.input_tokens ?? usageObj.prompt_tokens;
  const completionTokensRaw = usageObj.output_tokens ?? usageObj.completion_tokens;
  const totalTokensRaw = usageObj.total_tokens;

  const promptTokens = typeof promptTokensRaw === 'number' ? promptTokensRaw : undefined;
  const completionTokens =
    typeof completionTokensRaw === 'number' ? completionTokensRaw : undefined;
  const totalTokens = typeof totalTokensRaw === 'number' ? totalTokensRaw : undefined;

  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined)
    return undefined;

  return { promptTokens, completionTokens, totalTokens };
}

export function contentFromOpenAI(resp: unknown): string {
  if (!resp || typeof resp !== 'object') return '';
  const obj = resp as OpenAIResponseLike;

  const outputText = obj.output_text;
  if (typeof outputText === 'string' && outputText) return outputText;

  const choicesVal = obj.choices;
  if (Array.isArray(choicesVal) && choicesVal.length > 0) {
    const firstChoice = choicesVal[0] as OpenAIChoiceLike;
    const message = firstChoice.message;
    const content = message?.content;
    if (typeof content === 'string') return content;
  }

  const outputVal = obj.output;
  if (!Array.isArray(outputVal)) return '';
  const parts: string[] = [];
  for (const rawItem of outputVal) {
    const item = rawItem as OpenAIOutputItemLike;
    const contentItems = item.content;
    if (!Array.isArray(contentItems)) continue;
    for (const rawContent of contentItems) {
      const c = rawContent as OpenAIContentItemLike;
      const text = c.text;
      if (typeof text === 'string' && text) parts.push(text);
    }
  }
  return parts.join('\n');
}
