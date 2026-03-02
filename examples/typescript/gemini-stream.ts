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
  axon.hook.before((req: LLMRequest, _ctx: CallContext) => {
    console.log(`\n[Pre-Hook] Sending ${req.messages.length} message(s) to ${req.model}`);
    return req;
  });

  // After Hook: Log the response (fires AFTER the stream finishes)
  axon.hook.after((_req: LLMRequest, res: LLMResponse, ctx: CallContext) => {
    console.log(`\n[Post-Hook] Received response (${res.usage?.totalTokens ?? '?'} tokens)`);
    console.log(`[Post-Hook] Trace ID: ${ctx.traceId}`);
    return res;
  });

  // 4. Make the call (Streaming Gemini SDK Code)
  const input = 'My favorite color is blue and I live in Paris.';
  console.log(`[User]: ${input}`);
  process.stdout.write('[AI]: ');

  // Switch to generateContentStream
  const response = await client.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: input,
  });

  // 5. Output result by iterating over the generator
  for await (const chunk of response) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      process.stdout.write(text);
    }
  }

  process.stdout.write('\n');
}

main().catch(console.error);
