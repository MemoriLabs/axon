import type { LLMRequest, Message, Usage } from "../../types.js";

export function openaiInputToMessages(input: any): Message[] {
  if (typeof input === "string") return [{ role: "user", content: input }];
  if (!Array.isArray(input)) {
    throw new TypeError("OpenAI input must be a string or a list of {role, content} objects.");
  }
  return input.map((item) => {
    const role = item?.role;
    const content = item?.content;
    if (!role || content === undefined) {
      throw new TypeError("OpenAI input objects must include role and content.");
    }
    return { role, content };
  });
}

export function messagesToOpenAIInput(request: LLMRequest): Array<{ role: string; content: string }> {
  return request.messages.map((m) => ({ role: m.role, content: m.content }));
}

export function usageFromOpenAI(resp: any): Usage | undefined {
  const usage = resp?.usage;
  if (!usage) return undefined;

  const promptTokens = usage.input_tokens ?? usage.prompt_tokens;
  const completionTokens = usage.output_tokens ?? usage.completion_tokens;
  const totalTokens = usage.total_tokens;

  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) return undefined;

  return { promptTokens, completionTokens, totalTokens };
}

export function contentFromOpenAI(resp: any): string {
  const outputText = resp?.output_text;
  if (typeof outputText === "string" && outputText) return outputText;

  const choices = resp?.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const content = choices[0]?.message?.content;
    if (typeof content === "string") return content;
  }

  const output = resp?.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    const contentItems = item?.content;
    if (!Array.isArray(contentItems)) continue;
    for (const c of contentItems) {
      const text = c?.text;
      if (typeof text === "string" && text) parts.push(text);
    }
  }
  return parts.join("\n");
}
