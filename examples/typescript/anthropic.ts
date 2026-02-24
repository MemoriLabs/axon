import 'dotenv/config';
import { Axon, LLMRequest, LLMResponse, CallContext } from '../src/index.js';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is missing.');
  process.exit(1);
}

async function main() {
  const client = new Anthropic();

  // 1. Initialize Axon
  const axon = new Axon();

  // 2. Register the Anthropic Client
  console.log('Registering Anthropic client...');
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
    // Anthropic content is an array of blocks; we just log a snippet of the text
    console.log(`[Post-Hook] Content: "${res.content.replace(/\n/g, ' ').substring(0, 50)}..."`);
    console.log(`[Post-Hook] Trace ID: ${ctx.traceId}`);
    return res;
  });

  // 4. Make the call (Standard Anthropic Code)
  console.log('Sending query to Claude...');

  const message = await client.messages.create({
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Explain quantum entanglement in one sentence.' }],
    // Updated to the active model for 2026
    model: 'claude-sonnet-4-5',
  });

  // 5. Output result
  console.log('\n--- Final Output ---');

  // Anthropic specifically returns content blocks
  const textBlock = message.content.find((b) => b.type === 'text');
  if (textBlock) {
    console.log(textBlock.text);
  }
}

main().catch(console.error);
