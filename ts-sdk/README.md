# Memori Axon - TypeScript SDK

TypeScript SDK for Memori's hosted memory service.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Format existing code
npm run format

# Run type check
npm run typecheck

# Build the project
npm run build
```

---

## 📜 Available Commands

### Development

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `npm run build`   | Compile TypeScript to `dist/` |
| `npm run example` | Build and run example script  |

### Testing

| Command              | Description             |
| -------------------- | ----------------------- |
| `npm test`           | Run tests once          |
| `npm run test:watch` | Run tests in watch mode |

### Code Quality

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run lint`         | Check for linting issues                 |
| `npm run lint:fix`     | Auto-fix linting issues                  |
| `npm run format`       | Format all files with Prettier           |
| `npm run format:check` | Check formatting without modifying files |
| `npm run typecheck`    | Run TypeScript type checking (no build)  |

---

## 🔧 Git Hooks

Pre-commit and pre-push hooks are configured to maintain code quality automatically.

### Pre-commit Hook

Runs automatically on `git commit`:

- ✅ ESLint (with auto-fix)
- ✅ Prettier (formatting)
- ✅ Only checks staged files

### Pre-push Hook

Runs automatically on `git push`:

- ✅ TypeScript type checking

### Bypass Hooks (Use Sparingly)

```bash
git commit --no-verify   # Skip pre-commit hook
git push --no-verify     # Skip pre-push hook
```

---

## 📦 Project Structure

```
ts-sdk/
├── src/             # Source code
├── tests/           # Test files
├── examples/        # Example scripts
├── dist/            # Compiled output (generated)
└── ...config files
```

---

## 🛠️ Development Workflow

1. Make your changes
2. Run `npm run lint:fix` to auto-fix issues
3. Run `npm run typecheck` to verify types
4. Commit your changes (hooks run automatically)
5. Push to remote (type check runs automatically)
