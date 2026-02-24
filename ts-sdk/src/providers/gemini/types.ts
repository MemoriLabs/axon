export interface GeminiGenerateContentArgs {
  model: string;
  contents: string | Array<{ role?: string; parts: Array<{ text?: string }> }>;
  [key: string]: unknown;
}

export interface GeminiClient {
  models?: {
    generateContent: (args: GeminiGenerateContentArgs) => Promise<unknown>;
    generateContentStream?: (args: GeminiGenerateContentArgs) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
}
