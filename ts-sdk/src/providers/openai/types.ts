// OpenAI client interface (minimal shape we need)
export interface OpenAIClient {
  responses?: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
    __axon_patched__?: boolean;
  };
  chat?: {
    completions?: {
      create: (args: Record<string, unknown>) => Promise<unknown>;
      __axon_patched__?: boolean;
    };
  };
}

// Type guards
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isArrayOfObjects(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((item) => isObject(item));
}
