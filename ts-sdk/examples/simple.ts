import 'dotenv/config';
import { Axon, LLMRequest, LLMResponse, CallContext } from '../src/index.js';
import { OpenAI } from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is missing.');
  process.exit(1);
}

async function main() {
  const client = new OpenAI();

  // 1. Initialize Axon (Clean configuration)
  const axon = new Axon({
    config: {
      collectHookTimings: true,
      failFast: true,
    },
  });

  // 2. Register the LLM Client
  console.log('Registering client...');
  axon.llm.register(client);

  // 3. Register Hooks (Fluent API)

  // Before Hook: Log the request
  axon.before.register(async (req: LLMRequest, ctx: CallContext) => {
    console.log(`\n[Pre-Hook] Sending ${req.messages.length} message(s) to ${req.model}`);
    // You can modify 'req' here if you want
    return req;
  });

  // After Hook: Log the response
  axon.after.register(async (req: LLMRequest, res: LLMResponse, ctx: CallContext) => {
    console.log(`[Post-Hook] Received response (${res.usage?.totalTokens ?? '?'} tokens)`);
    console.log(`[Post-Hook] Trace ID: ${ctx.traceId}`);
    return res;
  });

  // 4. Make the call (Standard OpenAI Code)
  console.log('Sending query...');
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say hello in French!' }],
    stream: false,
  });

  // 5. Output result
  console.log('\n--- Final Output ---');
  console.log(response.choices[0].message.content);
}

main().catch(console.error);
