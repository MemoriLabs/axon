import type { CallContext } from '@/types/index.js';

/**
 * Structure for hook timing data stored in context metadata.
 *
 * @internal
 */
export interface HookTimingsBucket {
  before_call?: Array<{ task: string; ms: number }>;
  before_call_total?: number;
  after_call?: Array<{ task: string; ms: number }>;
  after_call_total?: number;
}

/**
 * Get or create the hook timings bucket in the call context metadata.
 *
 * This function ensures the nested metadata structure exists and returns
 * a reference to the hook timings bucket where timing data is stored.
 *
 * @internal
 * This is part of the internal timing infrastructure.
 *
 * @param ctx - The call context
 * @returns The hook timings bucket
 */
export function getTimingsBucket(ctx: CallContext): HookTimingsBucket {
  if (!ctx.metadata.axon) {
    ctx.metadata.axon = {};
  }
  const meta = ctx.metadata.axon as Record<string, unknown>;

  if (!meta.hookTimingsMs) {
    meta.hookTimingsMs = {};
  }
  return meta.hookTimingsMs as HookTimingsBucket;
}

/**
 * Record a hook's execution timing in the call context.
 *
 * Timing data is stored per-phase (before_call, after_call) with both
 * individual task timings and aggregate totals.
 *
 * @internal
 * This is part of the internal timing infrastructure.
 *
 * @param ctx - The call context
 * @param phase - The hook phase ('before_call' or 'after_call')
 * @param taskName - The name of the task that was executed
 * @param ms - The execution time in milliseconds
 */
export function recordHookTiming(
  ctx: CallContext,
  phase: 'before_call' | 'after_call',
  taskName: string,
  ms: number
): void {
  const bucket = getTimingsBucket(ctx);

  // Add individual task timing
  if (!bucket[phase]) {
    bucket[phase] = [];
  }
  bucket[phase].push({ task: taskName, ms });

  // Update total
  const totalKey = `${phase}_total` as const;
  const currentTotal = bucket[totalKey] ?? 0;
  bucket[totalKey] = currentTotal + ms;
}

/**
 * Get timing information for a specific phase from the call context.
 *
 * @internal
 *
 * @param ctx - The call context
 * @param phase - The hook phase to retrieve timings for
 * @returns Object containing total time and individual task timings, or undefined if not collected
 */
export function getTimingsForPhase(
  ctx: CallContext,
  phase: 'before_call' | 'after_call'
): { total: number; items: Array<{ task: string; ms: number }> } | undefined {
  const axonMeta = ctx.metadata.axon as Record<string, unknown> | undefined;
  const timings = axonMeta?.hookTimingsMs as HookTimingsBucket | undefined;

  if (!timings) {
    return undefined;
  }

  const totalKey = `${phase}_total` as const;
  const total = timings[totalKey];
  const items = timings[phase];

  if (total === undefined || !items) {
    return undefined;
  }

  return { total, items };
}
