[![Memori Labs](https://s3.us-east-1.amazonaws.com/images.memorilabs.ai/banner.png)](https://memorilabs.ai/)

# Contributing to Axon

Thank you for your interest in contributing to Axon!

---

## TypeScript SDK

We use standard Node.js and NPM for dependency management and local development. The SDK is designed to be lightweight and runs entirely locally without the need for Docker or complex infrastructure.

### Prerequisites

* Node.js >= 18.0.0
* npm (Node Package Manager)

### Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/MemoriLabs/axon.git
cd axon/ts-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run unit tests
npm test
```

### Development Commands

We provide several NPM scripts to help streamline development:

```bash
# Run unit tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with Vitest UI
npm run test:ui

# Format code using Prettier
npm run format

# Check linting using ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run TypeScript type checking
npm run typecheck

# Run all formatting, linting, and type checks
npm run check
```

### Testing

We use `vitest` for our testing framework. Our goal is to maintain high test coverage, particularly for the core hook logic and provider patchers.

### Running Tests

All tests are configured to run purely locally and use mock objects, so no API keys or external services are required to run the test suite.

```bash
# Run all tests
npm test
```

### Test Coverage

Coverage reports are generated automatically when running:

```bash
npm run test:coverage
```

Ensure that any new features or bug fixes include corresponding unit tests to maintain our >80% coverage goals.

### Project Structure

```text
src/
  core/              # Core Axon class and lifecycle management
  hooks/             # Hook registries and proxy interceptors
  llm/               # Global LLM provider registry
  providers/         # Provider-specific patching logic (OpenAI, Anthropic, Gemini)
  errors/            # Custom SDK error classes
  types/             # Shared TypeScript interfaces
tests/               # Vitest test suite mirroring the src/ directory
package.json         # Dependencies and NPM scripts
tsconfig.json        # TypeScript configuration
eslint.config.js     # Linting rules
vitest.config.ts     # Test runner configuration
```

### Code Quality

We strictly enforce code quality using ESLint, Prettier, and TypeScript's strict mode.

```bash
# Format and lint before committing
npm run check
```

#### Code Standards

* **TypeScript:** Strict type checking is enabled. Avoid `any`; use `unknown` if a type is truly dynamic, and cast appropriately.
* **Formatting:** Handled automatically by Prettier.
* **Simplicity:** Lean, simple code is preferred. Ensure the hook interceptors and proxy objects remain as performant as possible.
* **Self-Documenting:** Use clear, descriptive variable names. Only add TSDoc comments to public-facing API methods (e.g., `axon.llm.register`) to provide IDE IntelliSense for end-users.

### Supported Integrations (TypeScript)

If you are contributing a new provider integration, ensure it adheres to the existing structure found in `src/providers/`:

* Implement a `detect.ts` to identify the client instance.
* Implement a `proxy.ts` to hook into the client's original methods.
* Implement a `common.ts` to normalize the provider's specific request/response formats into Axon's universal `LLMRequest` and `LLMResponse` types.

---

## Pull Request Guidelines

1. **Fork and branch**: Create a feature branch from `main` (e.g., `feature/add-new-provider` or `fix/proxy-bug`).
2. **Write tests**: Add or update tests in the `tests/` directory for your changes.
3. **Pass all checks**: Ensure your test suite and linting commands complete successfully.
4. **Update docs**: Update the `README.md` if you are adding user-facing features.
5. **Atomic commits**: Keep commits focused and provide clear, descriptive commit messages.