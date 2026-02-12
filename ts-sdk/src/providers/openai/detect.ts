export function isOpenAIClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const obj = client as any;

  const hasResponses = obj.responses && typeof obj.responses.create === 'function';
  const hasChat = obj.chat?.completions && typeof obj.chat.completions.create === 'function';

  return hasResponses || hasChat;
}
