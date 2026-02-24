/**
 * Centralized provider identifiers used for metadata and display.
 */
export const PROVIDERS = {
  OPENAI: { id: 'openai', name: 'OpenAI' },
  ANTHROPIC: { id: 'anthropic', name: 'Anthropic' },
  GEMINI: { id: 'gemini', name: 'Gemini' },
} as const;

export const SUPPORTED_PROVIDERS = [
  PROVIDERS.OPENAI.name,
  PROVIDERS.ANTHROPIC.name,
  PROVIDERS.GEMINI.name,
] as const;
