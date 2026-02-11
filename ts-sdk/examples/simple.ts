import 'dotenv/config';
import { Axon, Task, LLMRequest, CallContext, LLMResponse } from '@/index.js';
import { OpenAI } from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is missing.');
  process.exit(1);
}

const client = new OpenAI();

class LoggingTask implements Task {
  // FIX: Add specific types to 'req' and 'ctx'
  before_call(req: LLMRequest, ctx: CallContext) {
    console.log(`[LoggingTask] Sending request with ${req.messages.length} message(s)`);
    return req;
  }

  // FIX: Add specific types to 'req', 'resp', and 'ctx'
  after_call(req: LLMRequest, resp: LLMResponse, ctx: CallContext) {
    console.log(`[LoggingTask] Received response: "${resp.content.slice(0, 50)}..."`);
    return resp;
  }
}

const axon = new Axon({
  tasks: [new LoggingTask()],
  config: {
    collectHookTimings: true,
    failFast: true,
  }
});

console.log('Registering client...');
await axon.register(client);

console.log('Sending query...');
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini', // or 'gpt-4'
  messages: [{ role: 'user', content: 'Say hello!' }]
});

console.log('\n--- Latency Report ---');
axon.showLatency('before');
axon.showLatency('after');