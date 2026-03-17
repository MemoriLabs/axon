export interface GeminiGenerateContentArgs {
  model: string;
  contents: string | Array<{ role?: string; parts: Array<{ text?: string }> }>;
  // Explicitly type the config object so we don't have to cast it later!
  config?: {
    systemInstruction?: string | { parts?: Array<{ text?: string }> };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * The minimal expected shape of an initialized Google Gemini client instance.
 * Axon uses this interface to detect and safely patch the `models.generateContent`
 * and `models.generateContentStream` methods.
 */
export interface GeminiClient {
  models?: {
    generateContent: (args: GeminiGenerateContentArgs) => Promise<unknown>;
    generateContentStream?: (args: GeminiGenerateContentArgs) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
}
