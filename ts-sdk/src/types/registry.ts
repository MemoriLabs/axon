import type { Axon } from '../core/axon.js';

/**
 * A function that inspects an unknown object to determine if it is a supported LLM client.
 * @param client - The unknown client instance to inspect.
 * @returns True if the client matches this provider's expected shape.
 */
export type ClientMatcher = (client: unknown) => boolean;

/**
 * A function that applies Axon's proxy hooks to a specific LLM client instance.
 * @param client - The client instance to patch.
 * @param axon - The central Axon instance managing the hooks.
 */
export type ClientPatcher = (client: unknown, axon: Axon) => void;
