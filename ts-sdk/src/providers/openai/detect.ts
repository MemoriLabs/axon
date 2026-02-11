export function isOpenAIClient(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;

  const obj = client as Record<string, unknown>;

  // Check for responses API
  if (obj.responses && typeof obj.responses === 'object') {
    const responses = obj.responses as Record<string, unknown>;
    if (typeof responses.create === 'function') return true;
  }

  // Check for chat.completions API
  if (obj.chat && typeof obj.chat === 'object') {
    const chat = obj.chat as Record<string, unknown>;
    if (chat.completions && typeof chat.completions === 'object') {
      const completions = chat.completions as Record<string, unknown>;
      if (typeof completions.create === 'function') return true;
    }
  }

  return false;
}
