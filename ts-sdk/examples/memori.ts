import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { OpenAI } from 'openai';
import { Axon, LLMRequest, LLMResponse, CallContext, Message } from '../src/index.js';

/**
 * Validates existence of environment variables to ensure strict type safety (string).
 * Fails fast if configuration is missing.
 */
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.error(`Error: Missing required environment variable (${key}).`);
    process.exit(1);
  }
  return value;
};

const CONFIG = {
  apiKey: getEnv('API_KEY'),
  apiToken: getEnv('API_TOKEN'),
  openAiKey: getEnv('OPENAI_API_KEY'),
  entityId: 'typescript-axon',
  sessionId: randomUUID(),
  baseUrl: 'https://staging-api.memorilabs.ai/v1/hosted',
  collectorUrl: 'https://staging-collector.memorilabs.ai/v1/hosted',
} as const;

interface MemoriMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  text?: string;
  type?: string | null;
}

interface RecallResponse {
  conversation: {
    messages: MemoriMessage[];
  };
}

/**
 * Client for interacting with the Memori API.
 * Encapsulates authentication and endpoint logic.
 */
class MemoriClient {
  private readonly headers: Record<string, string>;

  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
      'X-Memori-API-Key': CONFIG.apiKey,
      Authorization: `Bearer ${CONFIG.apiToken}`,
    };
  }

  /** Retrieves relevant memories based on the user's query. */
  async recall(query: string): Promise<RecallResponse | null> {
    try {
      const res = await fetch(`${CONFIG.baseUrl}/recall`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          attribution: { entity: { id: CONFIG.entityId } },
          query,
          session: { id: CONFIG.sessionId },
        }),
      });

      if (!res.ok) {
        console.warn(`[MemoriClient] Recall failed: ${res.status} ${res.statusText}`);
        return null;
      }

      return await (res.json() as Promise<RecallResponse>);
    } catch (error) {
      console.error('[MemoriClient] Error during recall:', error);
      return null;
    }
  }

  /** Persists the conversation turn (User -> Assistant) to storage. */
  async saveConversation(lastUserMsg: string, assistantMsg: string): Promise<void> {
    try {
      const res = await fetch(`${CONFIG.baseUrl}/conversation/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          attribution: { entity: { id: CONFIG.entityId } },
          messages: [
            { role: 'user', type: null, text: lastUserMsg },
            { role: 'assistant', type: 'text', text: assistantMsg },
          ],
          session: { id: CONFIG.sessionId },
        }),
      });
      console.log(`[Memori] Save Conversation Status: ${res.status}`);
    } catch (error) {
      console.error('[MemoriClient] Failed to save conversation:', error);
    }
  }

  /** Sends conversation data to the collector for offline processing/augmentation. */
  async augment(lastUserMsg: string, assistantMsg: string): Promise<void> {
    try {
      const res = await fetch(`${CONFIG.collectorUrl}/augmentation`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          conversation: {
            messages: [
              { role: 'user', content: lastUserMsg },
              { role: 'assistant', content: assistantMsg },
            ],
            summary: null,
          },
          meta: {
            attribution: { entity: { id: CONFIG.entityId } },
            llm: { model: { provider: 'openai' } },
            sdk: { lang: 'typescript', version: '0.1.0' },
          },
          session: { id: CONFIG.sessionId },
        }),
      });
      console.log(`[Memori] Augmentation Status: ${res.status}`);
    } catch (error) {
      console.error('[MemoriClient] Failed to augment data:', error);
    }
  }
}

const memori = new MemoriClient();

/**
 * Hook: Inject Memories.
 * Fetches relevant context based on the user's last message and appends it to the history
 * *before* the LLM sees it.
 */
async function injectMemories(request: LLMRequest, _ctx: CallContext): Promise<LLMRequest> {
  const lastMessage = request.messages[request.messages.length - 1];

  if (lastMessage.role !== 'user') {
    return request;
  }

  const memories = await memori.recall(lastMessage.content);

  if (memories) {
    // Map Memori's format to Axon's Message format
    const memoryMessages: Message[] = memories.conversation.messages.map((m) => ({
      role: m.role as Message['role'],
      content: m.text ?? m.content ?? '',
    }));

    console.log(
      `[Hook: Before] Injecting ${memoryMessages.length} memory message(s) into context...`
    );

    return {
      ...request,
      messages: [...request.messages, ...memoryMessages],
    };
  }

  return request;
}

/**
 * Hook: Capture Interaction.
 * Asynchronously saves the user/assistant turn to Memori for future recall.
 * This runs in parallel (non-blocking) to the response return.
 */
async function captureInteraction(
  request: LLMRequest,
  response: LLMResponse,
  _ctx: CallContext
): Promise<LLMResponse> {
  const lastUserMsg = request.messages[request.messages.length - 1].content;
  const assistantMsg = response.content;

  console.log('[Hook: After] Capturing interaction for memory ingestion...');

  await Promise.all([
    memori.saveConversation(lastUserMsg, assistantMsg),
    memori.augment(lastUserMsg, assistantMsg),
  ]);

  return response;
}

async function main() {
  const client = new OpenAI({ apiKey: CONFIG.openAiKey });
  const axon = new Axon();

  // Register OpenAI client and hooks into the Axon pipeline
  axon.llm.register(client);
  axon.before.register(injectMemories);
  axon.after.register(captureInteraction);

  const runTurn = async (input: string) => {
    console.log(`\nUser: ${input}`);
    process.stdout.write('Assistant: ');

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: input }],
      stream: true,
    });

    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
    }
    process.stdout.write('\n');
  };

  // Turn 1: Establish context
  await runTurn('My favorite color is blue and I live in Paris');

  console.log('\n--- Waiting for ingestion (5s) ---');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Turn 2: Recall context (via injectMemories hook)
  await runTurn('What is my favorite color?');

  await new Promise((resolve) => setTimeout(resolve, 1000));
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('Fatal error in main process:', error.message);
  } else {
    console.error('Fatal error in main process:', String(error));
  }
  process.exit(1);
});
