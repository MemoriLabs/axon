import { Axon } from '../core/axon.js';
import { UnsupportedLLMProviderError } from '../errors/unsupported-provider-error.js';

export type Matcher = (client: unknown) => boolean;
export type Patcher = (client: unknown, axon: Axon) => void;

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
  await import('../providers/index.js');
  providersLoaded = true;
}

export async function patchClient(axon: Axon, client: unknown): Promise<void> {
  await ensureProvidersLoaded();

  for (const reg of registrations) {
    if (reg.matcher(client)) {
      reg.patcher(client, axon);
      return;
    }
  }

  let provider: string;
  if (client && typeof client === 'object' && 'constructor' in client) {
    const ctorName = (client as { constructor: { name: string } }).constructor.name;
    provider = ctorName || 'Object';
  } else {
    provider = typeof client;
  }

  throw new UnsupportedLLMProviderError(provider);
}
