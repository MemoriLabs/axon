/**
 * Represents the common internal structure of auto-generated LLM clients (like Stainless).
 * @internal
 */
export type VersionedClient = {
  VERSION?: string;
  version?: string;
  getUserAgent?: () => string;
  defaultHeaders?: (opts?: unknown) => Record<string, string>;
};

/**
 * Attempts to safely extract the SDK version from an LLM client instance.
 * @internal
 */
export function extractSDKVersion(client: unknown): string | null {
  const vClient = client as VersionedClient;

  // 1. Check for standard attached properties
  if (typeof vClient.VERSION === 'string') return vClient.VERSION;
  if (typeof vClient.version === 'string') return vClient.version;

  // 2. Sniff the version from the internal User-Agent generator
  if (typeof vClient.getUserAgent === 'function') {
    try {
      const ua = vClient.getUserAgent(); // e.g., "OpenAI/JS 4.28.0"
      const match = ua.match(/([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?)/);
      if (match) return match[1];
    } catch {
      // ignore, commenting for lint
    }
  }

  // 3. Sniff the version from the default headers payload
  if (typeof vClient.defaultHeaders === 'function') {
    try {
      const headers = vClient.defaultHeaders({});
      if (headers['x-stainless-package-version']) {
        return headers['x-stainless-package-version'];
      }
    } catch {
      // ignore, commenting for lint
    }
  }

  return null;
}
