import 'dotenv/config';
import { Axon, LLMRequest, LLMResponse, CallContext } from '@memorilabs/axon';
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is missing.');
  process.exit(1);
}

async function main() {
  // 1. Initialize the Gemini Client
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const axon = new Axon();

  // 2. Register the Gemini Client
  console.log('Registering Gemini client...');
  axon.llm.register(client);

  // 3. Register Hooks (Fluent API)

  // Before Hook: Log the request
  axon.before.register((req: LLMRequest, _ctx: CallContext) => {
    console.log(`\n[Pre-Hook] Sending ${req.messages.length} message(s) to ${req.model}`);
    return req;
  });

  // After Hook: Log the response
  axon.after.register((_req: LLMRequest, res: LLMResponse, ctx: CallContext) => {
    console.log(`[Post-Hook] Received response (${res.usage?.totalTokens ?? '?'} tokens)`);
    console.log(`[Post-Hook] Trace ID: ${ctx.traceId}`);
    return res;
  });

  // 4. Make the call (Standard Gemini SDK Code)
  console.log('[User]: My favorite color is blue and I live in Paris.');
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'My favorite color is blue and I live in Paris.',
  });

  // 5. Output result
  console.log(`[AI]: ${response.text}`);
}

main().catch(console.error);
