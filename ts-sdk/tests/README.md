# Tests

This directory contains the test suite for the Axon SDK.

## Directory Structure

```
tests/
├── fixtures/          # Shared test data and mock objects
│   └── messages.ts    # Message fixtures
├── utils/             # Test utilities and helpers
│   └── mocks.ts       # Mock factory functions
├── types/             # Tests for type utilities
│   └── context.test.ts
├── core/              # Tests for core Axon class
│   └── axon.test.ts
├── errors/            # Tests for error classes
│   └── errors.test.ts
├── providers/         # Tests for provider integrations
│   └── openai/
│       ├── detect.test.ts
│       ├── common.test.ts
│       └── adapter.test.ts
└── integration/       # End-to-end integration tests
    └── openai.integration.test.ts
```

## Test Organization

### Unit Tests

- **Location**: Mirror the `src/` structure
- **Naming**: `*.test.ts`
- **Purpose**: Test individual functions/classes in isolation
- **Mocking**: Use mocks for external dependencies

### Integration Tests

- **Location**: `tests/integration/`
- **Naming**: `*.integration.test.ts`
- **Purpose**: Test multiple components working together
- **Mocking**: Minimal - test real interactions

## Writing Tests

### Test File Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YourClass } from '../../src/your-module.js';

describe('YourClass', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      const instance = new YourClass();

      // Act
      const result = instance.methodName();

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices

1. **One test file per source file**
   - `src/core/axon.ts` → `tests/core/axon.test.ts`

2. **Descriptive test names**
   - Use: `'should return error when model is not provided'`
   - Not: `'test model validation'`

3. **Arrange-Act-Assert pattern**

   ```typescript
   // Arrange - Set up test data
   const input = { ... };

   // Act - Execute the code
   const result = functionUnderTest(input);

   // Assert - Verify the outcome
   expect(result).toBe(expected);
   ```

4. **Use fixtures for test data**

   ```typescript
   import { mockRequest, mockResponse } from '../fixtures/messages.js';
   ```

5. **Use utilities for common mocks**

   ```typescript
   import { createMockOpenAIClient } from '../utils/mocks.js';
   ```

6. **Mock external dependencies**

   ```typescript
   const mockAdapter = {
     call: vi.fn().mockResolvedValue(mockResponse),
   };
   ```

7. **Test edge cases**
   - Empty inputs
   - Null/undefined values
   - Error conditions
   - Boundary values

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- axon.test.ts

# Run tests matching pattern
npm test -- --grep "OpenAI"
```

## Coverage Goals

- **Target**: 80%+ coverage
- **Focus areas**:
  - Core logic (Axon class): 90%+
  - Providers (OpenAI): 85%+
  - Utilities (parsing): 90%+
  - Error handling: 100%

## Continuous Integration

Tests run automatically on:

- Every commit (pre-commit hook)
- Every pull request (GitHub Actions)
- Before publishing (pre-publish hook)

## Troubleshooting

### Tests fail with module not found

```bash
# Rebuild the project
npm run build
```

### Tests timeout

```typescript
// Increase timeout for slow tests
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Mocks not working

```typescript
// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Adding New Tests

1. **Create test file** in appropriate directory
2. **Follow naming convention**: `*.test.ts`
3. **Import test utilities**: `describe`, `it`, `expect`
4. **Add fixtures** if needed in `fixtures/`
5. **Run tests**: `npm test`
6. **Check coverage**: `npm run test:coverage`

## Example Test

```typescript
// tests/providers/openai/detect.test.ts
import { describe, it, expect } from 'vitest';
import { isOpenAIClient } from '../../../src/providers/openai/detect.js';

describe('isOpenAIClient', () => {
  it('should return true for valid OpenAI client', () => {
    const client = {
      responses: {
        create: () => Promise.resolve({}),
      },
    };

    expect(isOpenAIClient(client)).toBe(true);
  });

  it('should return false for invalid client', () => {
    expect(isOpenAIClient({})).toBe(false);
  });
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Arrange-Act-Assert Pattern](https://automationpanda.com/2020/07/07/arrange-act-assert-a-pattern-for-writing-good-tests/)
