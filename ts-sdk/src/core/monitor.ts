import { CallContext } from '../types/index.js';
import { getTimingsForPhase } from './timing.js';

/**
 * AxonMonitor provides utilities for inspecting and reporting on Axon metrics.
 */
export class AxonMonitor {
  /**
   * Print a latency report to the console for a specific call context.
   * * @param ctx - The call context to report on
   * @param phase - Which phase to show timings for
   */
  static logLatency(
    ctx: CallContext | undefined, 
    phase: 'before' | 'after' | 'before_call' | 'after_call'
  ): void {
    const phaseMap = {
      before: 'before_call',
      after: 'after_call',
      before_call: 'before_call',
      after_call: 'after_call',
    } as const;

    const normalizedPhase = phaseMap[phase];

    if (!ctx) {
      console.log('Axon latency: no call context provided.');
      return;
    }

    const timings = getTimingsForPhase(ctx, normalizedPhase);
    if (!timings) {
      console.log(
        `Axon latency (${normalizedPhase}): timings not collected (enable collectHookTimings=true).`
      );
      return;
    }

    console.log(`Axon latency (${normalizedPhase}): total=${timings.total.toFixed(3)}ms`);
    for (const item of timings.items) {
      console.log(`- ${item.task}: ${item.ms.toFixed(3)}ms`);
    }
  }
}