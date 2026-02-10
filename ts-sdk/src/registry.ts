import { UnsupportedLLMProviderError } from "./errors.js";

export type Matcher = (client: unknown) => boolean;
export type Patcher = (client: any, axon: any) => void;

interface ClientRegistration {
  matcher: Matcher;
  patcher: Patcher;
}

const registrations: ClientRegistration[] = [];
let providersLoaded = false;

export function registerClient(matcher: Matcher, patcher: Patcher): void {
  registrations.push({ matcher, patcher });
}

async function ensureProvidersLoaded(): Promise<void> {
  if (providersLoaded) return;
  await import("./providers/index.js");
  providersLoaded = true;
}

export async function patchClient(axon: any, client: any): Promise<void> {
  await ensureProvidersLoaded();

  for (const reg of registrations) {
    if (reg.matcher(client)) {
      reg.patcher(client, axon);
      return;
    }
  }

  const provider = client?.constructor?.name ? String(client.constructor.name) : typeof client;
  throw new UnsupportedLLMProviderError(provider);
}
