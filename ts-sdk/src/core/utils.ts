/**
 * Extract a readable name from a task object.
 *
 * This function attempts to get the constructor name from a task object,
 * falling back to '<anonymous>' if the name cannot be determined.
 *
 * @internal
 * This is part of the internal task handling infrastructure.
 *
 * @param task - The task object (can be any object with a constructor)
 * @returns The task's class name or '<anonymous>' if unavailable
 *
 * @example
 * ```typescript
 * class MyTask {
 *   before_call(req, ctx) { ... }
 * }
 *
 * const task = new MyTask();
 * getTaskName(task); // Returns: "MyTask"
 *
 * const literalTask = { before_call: () => {} };
 * getTaskName(literalTask); // Returns: "Object"
 *
 * getTaskName(null); // Returns: "<anonymous>"
 * ```
 */
export function getTaskName(task: unknown): string {
  if (!task || typeof task !== 'object') {
    return '<anonymous>';
  }

  const obj = task as { constructor?: { name?: string } };
  return obj.constructor?.name ?? '<anonymous>';
}

/**
 * Extract a readable name from an adapter object.
 *
 * Similar to getTaskName but specialized for LLM adapter objects.
 *
 * @internal
 * This is part of the internal adapter handling infrastructure.
 *
 * @param adapter - The adapter object
 * @returns The adapter's class name or '<anonymous>' if unavailable
 */
export function getAdapterName(adapter: unknown): string {
  return getTaskName(adapter);
}
