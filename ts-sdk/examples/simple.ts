import 'dotenv/config';
import { Axon, Task, LLMRequest, CallContext, LLMResponse } from '../src/index.js';
import { OpenAI } from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is missing.');
  process.exit(1);
}

const client = new OpenAI();

class LoggingTask implements Task {
  /**
   * Explicitly typing 'req' and 'ctx' resolves TS7006 "Implicit Any" errors.
   */
  before_call(req: LLMRequest, ctx: CallContext): LLMRequest {
    console.log(`[LoggingTask] Sending request with ${req.messages.length} message(s)`);
    return req;
  }

  /**
   * Explicitly typing 'req', 'resp', and 'ctx'.
   */
  after_call(req: LLMRequest, resp: LLMResponse, ctx: CallContext): LLMResponse {
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
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Say hello!' }]
});

console.log('\n--- Latency Report ---');
axon.showLatency('before');
axon.showLatency('after');