## axon (Python SDK)

Composable wrapper around LLM calls with `before_call` / `after_call` hooks, plus a
convenience API: `axon.before.register(func)` and `axon.after.register(func)`.

LLM client patching uses `axon.llm.register(client)`.

### Development

Run tests:

```bash
uv run pytest
```

Run the example:

```bash
uv run examples/simple.py
```
