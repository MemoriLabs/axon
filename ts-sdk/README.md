[![Memori Labs](https://images.memorilabs.ai/banner.png)](https://memorilabs.ai/)

<p align="center">
  <strong>The universal LLM interceptor and hook registry</strong>
</p>

<p align="center">
  <i>Axon plugs into the official LLM SDKs you already use. It allows you to seamlessly intercept, modify, and monitor LLM requests and responses through a unified hook system without changing your underlying application code.</i>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@memorilabs/axon">
    <img src="https://img.shields.io/npm/v/@memorilabs/axon.svg" alt="NPM version">
  </a>
  <a href="https://www.npmjs.com/package/@memorilabs/axon">
    <img src="https://img.shields.io/npm/dm/@memorilabs/axon.svg" alt="NPM Downloads">
  </a>
  <a href="https://opensource.org/license/apache-2-0">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License">
  </a>
  <a href="https://discord.gg/abD4eGym6v">
    <img src="https://img.shields.io/discord/1042405378304004156?logo=discord" alt="Discord">
  </a>
</p>

---

## Getting Started

Install the Axon SDK and your preferred LLM client using your package manager of choice:

```bash
npm install @memorilabs/axon
```

_(Note: Axon supports `openai`, `@anthropic-ai/sdk`, and `@google/genai` as optional peer dependencies)._

## Quickstart Example

```typescript
import 'dotenv/config';
import { OpenAI } from 'openai';
import { Axon } from '@memorilabs/axon';

// 1. Initialize the LLM Client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 2. Initialize Axon and Register the Client
const axon = new Axon();
axon.llm.register(client);

// 3. Register a Before Hook (e.g., logging or modifying prompts)
axon.hook.before((req, ctx) => {
  console.log(`[${ctx.traceId}] Intercepted request to model: ${req.model}`);
  // You can modify the request here before it hits the provider
  return req;
});

// 4. Register an After Hook (e.g., token usage tracking)
axon.hook.after((req, res, ctx) => {
  console.log(`[${ctx.traceId}] Received response. Tokens used: ${res.usage?.totalTokens}`);
});

async function main() {
  console.log('Sending standard LLM request...');

  // 5. Use your client exactly as you normally would!
  // Axon intercepts this call in the background.
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'What is the speed of light?' }],
  });

  console.log(`AI: ${response.choices[0].message.content}`);
}

main().catch(console.error);
```

## Key Features

- **Universal LLM Support:** Works natively with OpenAI, Anthropic Claude, and Google Gemini SDKs.
- **Unified Hook System:** Write your logic once. Axon normalizes requests and responses across all providers so your hooks work universally.
- **Zero Overhead:** Plugs directly into your existing client initialization. No need to rewrite your agent or application logic.
- **Streaming Support:** Seamlessly handles and aggregates asynchronous streaming responses.
- **Type-Safe:** Written in strict TypeScript with comprehensive definitions for all provider payloads.

## Supported LLMs

- OpenAI (`openai`)
- Anthropic Claude (`@anthropic-ai/sdk`)
- Google Gemini (`@google/genai`)

## Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](https://github.com/MemoriLabs/axon/blob/main/CONTRIBUTING.md) for details on:

- Setting up your development environment
- Code style and standards
- Submitting pull requests
- Reporting issues

---

## Support

- **Discord**: [https://discord.gg/abD4eGym6v](https://discord.gg/abD4eGym6v)
- **Issues**: [GitHub Issues](https://github.com/MemoriLabs/axon/issues)

---

## License

Apache 2.0 - see [LICENSE](https://github.com/MemoriLabs/axon/blob/main/LICENSE)
