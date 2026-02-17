export function isAnthropicClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;

  const obj = client as { messages?: { create?: unknown } };

  return !!(obj.messages && typeof obj.messages.create === 'function');
}
