export function isOpenAIClient(client: any): boolean {
  if (!client || typeof client !== "object") return false;
  if (typeof client.responses?.create === "function") return true;
  if (typeof client.chat?.completions?.create === "function") return true;
  return false;
}
