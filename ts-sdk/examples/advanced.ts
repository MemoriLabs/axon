// import { Axon } from '@/index.js';
// import type { LLMRequest, LLMResponse, CallContext } from '@/index.js';

// // ============================================================================
// // Advanced Example: Async Hooks, Error Handling, and Direct Adapter Usage
// // ============================================================================

// /**
//  * Task with async hooks that simulates fetching data from a database
//  */
// class DatabaseTask {
//   async before_call(request: LLMRequest, ctx: CallContext): Promise<LLMRequest> {
//     console.log('[DatabaseTask] Fetching user context from database...');

//     // Simulate async database call
//     await new Promise(resolve => setTimeout(resolve, 10));

//     const userContext = {
//       userId: '123',
//       preferences: { tone: 'friendly' },
//     };

//     // Add to context metadata
//     ctx.metadata.user = userContext;

//     // Add system message with user context
//     return {
//       ...request,
//       messages: [
//         { role: 'system', content: 'You are a helpful assistant. Be friendly.' },
//         ...request.messages,
//       ],
//     };
//   }

//   async after_call(
//     _request: LLMRequest,
//     response: LLMResponse,
//     ctx: CallContext
//   ): Promise<void> {
//     console.log('[DatabaseTask] Saving response to database...');

//     // Simulate async database save
//     await new Promise(resolve => setTimeout(resolve, 10));

//     console.log('[DatabaseTask] Saved for user:', (ctx.metadata.user as any).userId);
//   }
// }

// /**
//  * Task that can fail to demonstrate error handling
//  */
// class ValidationTask {
//   before_call(request: LLMRequest, _ctx: CallContext): LLMRequest {
//     // Validate request
//     if (request.messages.length === 0) {
//       throw new Error('Request must contain at least one message');
//     }

//     const lastMessage = request.messages.at(-1);
//     if (!lastMessage || lastMessage.content.length === 0) {
//       throw new Error('Last message must have content');
//     }

//     console.log('[ValidationTask] Request validated successfully');
//     return request;
//   }
// }

// /**
//  * Task that modifies responses conditionally
//  */
// class ContentFilterTask {
//   after_call(
//     _request: LLMRequest,
//     response: LLMResponse,
//     _ctx: CallContext
//   ): LLMResponse | undefined {
//     const blockedWords = ['badword1', 'badword2'];
//     const hasBlockedContent = blockedWords.some(word =>
//       response.content.toLowerCase().includes(word)
//     );

//     if (hasBlockedContent) {
//       console.log('[ContentFilterTask] Blocked content detected, filtering...');
//       return {
//         ...response,
//         content: '[Content filtered by policy]',
//       };
//     }

//     console.log('[ContentFilterTask] Content passed filter');
//     // Return undefined = no modification
//     return undefined;
//   }
// }

// // ============================================================================
// // Main Examples
// // ============================================================================

// async function exampleWithAsyncTasks() {
//   console.log('\n' + '='.repeat(70));
//   console.log('Example 1: Async Tasks and Context Metadata');
//   console.log('='.repeat(70) + '\n');

//   const axon = new Axon({
//     tasks: [
//       new DatabaseTask(),
//       new ValidationTask(),
//       new ContentFilterTask(),
//     ],
//     config: {
//       failFast: true,
//       collectHookTimings: true,
//     },
//   });

//   // Mock client
//   const client = {
//     responses: {
//       async create(opts: any) {
//         return { output_text: `Response to: ${opts.input[0].content}` };
//       },
//     },
//   };

//   await axon.register(client);

//   const response = await client.responses.create({
//     model: 'test',
//     input: [{ role: 'user', content: 'Hello!' }],
//   });

//   console.log('\n📤 Final response:', response.output_text);
//   console.log('\n⏱️  Timings:');
//   axon.showLatency('before');
//   axon.showLatency('after');
// }

// async function exampleWithDirectAdapter() {
//   console.log('\n' + '='.repeat(70));
//   console.log('Example 2: Direct Adapter Usage (without client registration)');
//   console.log('='.repeat(70) + '\n');

//   // Custom adapter implementation
//   const customAdapter = {
//     async call(request: LLMRequest, _ctx: CallContext): Promise<LLMResponse> {
//       console.log('[CustomAdapter] Processing request...');

//       const lastMessage = request.messages.at(-1);
//       const content = lastMessage?.content || '';

//       // Simulate API call
//       await new Promise(resolve => setTimeout(resolve, 50));

//       return {
//         content: `Custom response to: "${content}"`,
//         usage: {
//           promptTokens: 10,
//           completionTokens: 20,
//           totalTokens: 30,
//         },
//       };
//     },
//   };

//   const axon = new Axon({
//     adapter: customAdapter,
//     tasks: [
//       {
//         before_call: (req) => {
//           console.log('[Hook] Before call:', req.messages.length, 'messages');
//           return req;
//         },
//         after_call: (_req, resp) => {
//           console.log('[Hook] After call, tokens used:', resp.usage?.totalTokens);
//         },
//       },
//     ],
//     config: {
//       collectHookTimings: true,
//     },
//   });

//   // Use the call() method directly
//   const response1 = await axon.call({
//     messages: [{ role: 'user', content: 'Direct call example' }],
//     model: 'custom-model',
//   });

//   console.log('📤 Response 1:', response1.content);

//   // Use the callText() convenience method
//   const response2 = await axon.callText('Simple text input', {
//     model: 'custom-model',
//   });

//   console.log('📤 Response 2:', response2.content);
//   console.log('\n⏱️  Timings from last call:');
//   axon.showLatency('before');
//   axon.showLatency('after');
// }

// async function exampleWithErrorHandling() {
//   console.log('\n' + '='.repeat(70));
//   console.log('Example 3: Error Handling with failFast=false');
//   console.log('='.repeat(70) + '\n');

//   const axon = new Axon({
//     tasks: [
//       {
//         before_call: (req) => {
//           console.log('[Task1] Processing...');
//           return req;
//         },
//       },
//       {
//         before_call: (_req) => {
//           console.log('[Task2] This will fail!');
//           throw new Error('Simulated task failure');
//         },
//       },
//       {
//         before_call: (req) => {
//           console.log('[Task3] This should not run');
//           return req;
//         },
//       },
//     ],
//     config: {
//       failFast: false,  // Wrap errors in AxonHookError
//     },
//   });

//   const client = {
//     responses: {
//       async create() {
//         return { output_text: 'This should not be called' };
//       },
//     },
//   };

//   await axon.register(client);

//   try {
//     await client.responses.create({
//       model: 'test',
//       input: [{ role: 'user', content: 'Test' }],
//     });
//   } catch (error) {
//     console.log('\n❌ Caught error:', error);

//     if (error instanceof Error) {
//       console.log('   Error name:', error.name);
//       console.log('   Error message:', error.message);
//     }
//   }
// }

// async function exampleWithBackgroundProcessing() {
//   console.log('\n' + '='.repeat(70));
//   console.log('Example 4: Background After-Call Processing');
//   console.log('='.repeat(70) + '\n');

//   const axon = new Axon({
//     tasks: [
//       {
//         before_call: (req) => {
//           console.log('[Hook] Before call (blocking)');
//           return req;
//         },
//         after_call: (_req, resp) => {
//           console.log('[Hook] After call (non-blocking background)');
//           // This runs in the background!
//           return resp;
//         },
//       },
//     ],
//     config: {
//       postCallBackground: true,  // Run after_call hooks in background
//       collectHookTimings: true,
//     },
//   });

//   const client = {
//     responses: {
//       async create() {
//         return { output_text: 'Response' };
//       },
//     },
//   };

//   await axon.register(client);

//   console.log('Making call...');
//   const response = await client.responses.create({
//     model: 'test',
//     input: [{ role: 'user', content: 'Test' }],
//   });
//   console.log('Call returned immediately!');
//   console.log('Response:', response.output_text);

//   // Wait a bit for background processing to complete
//   await new Promise(resolve => setTimeout(resolve, 100));
//   console.log('Background processing should be done now');
// }

// // ============================================================================
// // Run All Examples
// // ============================================================================

// async function main() {
//   try {
//     await exampleWithAsyncTasks();
//     await exampleWithDirectAdapter();
//     await exampleWithErrorHandling();
//     await exampleWithBackgroundProcessing();

//     console.log('\n' + '='.repeat(70));
//     console.log('✨ All examples completed!');
//     console.log('='.repeat(70) + '\n');
//   } catch (error) {
//     console.error('Fatal error:', error);
//     process.exit(1);
//   }
// }

// main();
