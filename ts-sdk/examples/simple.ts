// import { Axon } from '@/index.js';
// import type { LLMRequest, LLMResponse, CallContext, Task } from '@/index.js';

// // ============================================================================
// // Mock OpenAI-style client for demonstration
// // ============================================================================

// interface Message {
//   role: string;
//   content: string;
// }

// interface CreateOptions {
//   model: string;
//   input: Message[];
// }

// interface Response {
//   output_text: string;
// }

// const mockClient = {
//   responses: {
//     create(opts: CreateOptions): Promise<Response> {
//       // Simulate a simple echo API
//       const content = opts.input.map(m => m.content).join(' ');
//       return Promise.resolve({
//         output_text: `[Model: ${opts.model}] Echo: ${content}`
//       });
//     },
//   },
// };

// // ============================================================================
// // Example Tasks - Demonstrates different hook patterns
// // ============================================================================

// /**
//  * Task 1: Prefix transformer
//  * Adds a prefix to the last message before sending to the LLM
//  */
// class PrefixTask implements Task {
//   constructor(private prefix: string) {}

//   before_call(request: LLMRequest, _ctx: CallContext): LLMRequest {
//     const last = request.messages.at(-1);
//     if (!last) {
//       throw new Error('No messages in request');
//     }

//     console.log(`[PrefixTask] Adding prefix: "${this.prefix}"`);

//     return {
//       ...request,
//       messages: [
//         ...request.messages.slice(0, -1),
//         { ...last, content: `${this.prefix}${last.content}` }
//       ],
//     };
//   }
// }

// /**
//  * Task 2: Response logger
//  * Logs the canonical response after receiving it
//  */
// class ResponseLoggerTask implements Task {
//   after_call(
//     _request: LLMRequest,
//     response: LLMResponse,
//     ctx: CallContext
//   ): void {
//     console.log(`[ResponseLoggerTask] Received response:`, response.content);
//     console.log(`[ResponseLoggerTask] Trace ID: ${ctx.traceId}`);
//     // Returning void/undefined means "don't modify the response"
//   }
// }

// /**
//  * Task 3: Response transformer
//  * Modifies the response by adding a suffix
//  */
// class SuffixTask implements Task {
//   constructor(private suffix: string) {}

//   after_call(
//     _request: LLMRequest,
//     response: LLMResponse,
//     _ctx: CallContext
//   ): LLMResponse {
//     console.log(`[SuffixTask] Adding suffix: "${this.suffix}"`);

//     return {
//       ...response,
//       content: `${response.content}${this.suffix}`,
//     };
//   }
// }

// /**
//  * Task 4: Metadata collector
//  * Demonstrates adding custom metadata to the context
//  */
// class MetadataTask implements Task {
//   before_call(request: LLMRequest, ctx: CallContext): void {
//     // Add custom metadata to the context
//     ctx.metadata.customData = {
//       timestamp: new Date().toISOString(),
//       messageCount: request.messages.length,
//     };
//     console.log('[MetadataTask] Added custom metadata to context');
//   }

//   after_call(
//     _request: LLMRequest,
//     _response: LLMResponse,
//     ctx: CallContext
//   ): void {
//     console.log('[MetadataTask] Custom metadata:', ctx.metadata.customData);
//   }
// }

// // ============================================================================
// // Main Example
// // ============================================================================

// async function main() {
//   console.log('='.repeat(70));
//   console.log('Axon TypeScript SDK - Example');
//   console.log('='.repeat(70));
//   console.log();

//   // Create Axon instance with tasks and timing collection enabled
//   const axon = new Axon({
//     tasks: [
//       new PrefixTask('🤖 '),          // Adds emoji prefix
//       new MetadataTask(),              // Collects metadata
//       new ResponseLoggerTask(),        // Logs response
//       new SuffixTask(' ✨'),           // Adds sparkle suffix
//     ],
//     config: {
//       failFast: true,
//       postCallBackground: false,
//       collectHookTimings: true,  // Enable timing collection
//     },
//   });

//   // Register the mock client
//   console.log('📝 Registering mock client...');
//   await axon.register(mockClient);
//   console.log('✅ Client registered successfully!');
//   console.log();

//   // Make an LLM call
//   console.log('🚀 Making LLM call...');
//   console.log('─'.repeat(70));

//   const raw = await mockClient.responses.create({
//     model: 'gpt-test',
//     input: [{ role: 'user', content: 'Say hi' }],
//   });

//   console.log('─'.repeat(70));
//   console.log();

//   // Show the final result
//   console.log('📤 Final raw response:', raw.output_text);
//   console.log();

//   // Display hook execution timings
//   console.log('⏱️  Hook Execution Timings:');
//   console.log('─'.repeat(70));
//   axon.showLatency('before');
//   console.log();
//   axon.showLatency('after');
//   console.log('─'.repeat(70));
//   console.log();

//   // Expected flow demonstration
//   console.log('📋 What happened:');
//   console.log('1. Original input: "Say hi"');
//   console.log('2. PrefixTask added: "🤖 Say hi"');
//   console.log('3. Sent to API: "🤖 Say hi"');
//   console.log('4. API responded: "[Model: gpt-test] Echo: 🤖 Say hi"');
//   console.log('5. ResponseLoggerTask logged the response');
//   console.log('6. SuffixTask added: " ✨"');
//   console.log('7. Final output: "[Model: gpt-test] Echo: 🤖 Say hi ✨"');
//   console.log();

//   console.log('='.repeat(70));
//   console.log('✨ Example completed successfully!');
//   console.log('='.repeat(70));
// }

// // Run the example
// main().catch((error) => {
//   console.error('❌ Error:', error);
//   process.exit(1);
// });
