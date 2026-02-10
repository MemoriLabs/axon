export class AxonError extends Error {}

export class AxonHookError extends AxonError {
  public readonly hook: "before_call" | "after_call";
  public readonly taskName: string;
  public readonly cause: unknown;

  constructor(opts: { hook: "before_call" | "after_call"; taskName: string; cause: unknown }) {
    super(`${opts.hook} hook failed for task ${opts.taskName}: ${String(opts.cause)}`);
    this.hook = opts.hook;
    this.taskName = opts.taskName;
    this.cause = opts.cause;
  }
}

export class AxonAdapterError extends AxonError {
  public readonly adapterName: string;
  public readonly cause: unknown;

  constructor(opts: { adapterName: string; cause: unknown }) {
    super(`Adapter ${opts.adapterName} failed: ${String(opts.cause)}`);
    this.adapterName = opts.adapterName;
    this.cause = opts.cause;
  }
}

export class UnsupportedLLMProviderError extends AxonError {
  public readonly provider: string;

  constructor(provider: string) {
    super(`Unsupported LLM provider: ${provider}`);
    this.provider = provider;
  }
}
