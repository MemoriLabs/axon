[![Memori Labs](https://s3.us-east-1.amazonaws.com/images.memorilabs.ai/banner.png)](https://memorilabs.ai/)

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
  <a href="https://opensource.org/license/apache-2-0">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License">
  </a>
  <a href="https://discord.gg/abD4eGym6v">
    <img src="https://img.shields.io/discord/1042405378304004156?logo=discord" alt="Discord">
  </a>
</p>

---

## What is Axon?

Axon is a lightweight SDK wrapper that gives you complete visibility and control over your LLM traffic. Instead of building custom wrappers around OpenAI, Anthropic, or Gemini, Axon patches the official clients directly.

You write a hook once, and it normalizes the requests and responses across all supported providers.

* **Zero Overhead:** Plugs directly into your existing client initialization. No need to rewrite your agent or application logic.
* **Unified Hook System:** Modify prompts (`before`) or track token usage (`after`) using a single standard format, regardless of which LLM provider your app is talking to.
* **First-Class Streaming:** Seamlessly handles and aggregates asynchronous streaming responses behind the scenes so your hooks always get the full picture.

## Official SDK

Axon is available for TypeScript / Node.js:

* 🟦 **[TypeScript / Node.js SDK](./ts-sdk/README.md)**

---

## Quick Glance

Axon's API is designed to feel native and consistent.

### TypeScript

```typescript
import { OpenAI } from 'openai';
import { Axon } from '@memorilabs/axon';

const client = new OpenAI();
const axon = new Axon().llm.register(client);

// 1. Intercept and modify requests
axon.hook.before((req, ctx) => {
  console.log(`Sending to: ${req.model}`);
  return req;
});

// 2. Track responses and tokens
axon.hook.after((req, res, ctx) => {
  console.log(`Tokens used: ${res.usage?.totalTokens}`);
});

// 3. Call the client exactly as you normally would
await client.chat.completions.create({ ... });
```

---

## Supported Integrations

Currently, Axon can patch the following official SDKs out of the box:

| Provider | TypeScript Peer Dependency |
| --- | --- |
| **OpenAI** | `openai` |
| **Anthropic** | `@anthropic-ai/sdk` |
| **Google Gemini** | `@google/genai` |

---

## Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on how to set up your development environment, run tests, and submit pull requests.

## Support

* **Discord**: [Join our community](https://discord.gg/abD4eGym6v)
* **Issues**: [GitHub Issues](https://github.com/MemoriLabs/axon/issues)

## License

Apache 2.0 - see [LICENSE](./LICENSE)