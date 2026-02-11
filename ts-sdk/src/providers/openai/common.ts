/**
 * OpenAI Provider - Type Converters
 * 
 * This file contains functions for converting between OpenAI's format and
 * Axon's canonical format. These converters handle the translation layer
 * between provider-specific types and Axon's universal LLM types.
 * 
 * @module providers/openai/converters
 */

import { Message, LLMRequest, Usage } from "../../types/llm.js";
import { hasUsage, isTextResponse, isChatCompletionResponse, isStructuredResponse } from "./responses.js";

/**
 * Convert OpenAI input format to Axon's canonical Message format
 * 
 * OpenAI accepts either:
 * - A simple string (treated as user message)
 * - An array of {role, content} objects
 * 
 * @param input - OpenAI input (string or array of message objects)
 * @returns Array of canonical Message objects
 * @throws {TypeError} If input format is invalid
 * 
 * @example
 * ```typescript
 * // String input
 * openaiInputToMessages('Hello') // [{role: 'user', content: 'Hello'}]
 * 
 * // Array input
 * openaiInputToMessages([
 *   {role: 'user', content: 'Hello'},
 *   {role: 'assistant', content: 'Hi!'}
 * ]) // Same array with proper typing
 * ```
 */
export function openaiInputToMessages(input: unknown): Message[] {
  // Handle string input - convert to single user message
  if (typeof input === 'string') {
    return [{ role: 'user', content: input }];
  }

  // Input must be an array
  if (!Array.isArray(input)) {
    throw new TypeError(
      'OpenAI input must be a string or an array of {role, content} objects.'
    );
  }

  // Convert array items to canonical messages
  return input.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`OpenAI input item at index ${index} must be an object.`);
    }

    const obj = item as Record<string, unknown>;
    const role = obj.role;
    const content = obj.content;

    if (typeof role !== 'string') {
      throw new TypeError(`OpenAI input item at index ${index} must have a string 'role'.`);
    }

    if (content === undefined) {
      throw new TypeError(`OpenAI input item at index ${index} must have 'content'.`);
    }

    return { role, content } as Message;
  });
}

/**
 * Convert Axon's canonical messages to OpenAI input format
 * 
 * @param request - Canonical LLM request with messages
 * @returns Array of {role, content} objects for OpenAI
 * 
 * @example
 * ```typescript
 * const request = {
 *   messages: [{role: 'user', content: 'Hello'}],
 *   model: 'gpt-4'
 * };
 * 
 * messagesToOpenAIInput(request);
 * // [{role: 'user', content: 'Hello'}]
 * ```
 */
export function messagesToOpenAIInput(
  request: LLMRequest
): Array<{ role: string; content: string }> {
  return request.messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Extract token usage information from OpenAI response
 * 
 * Handles both newer (input_tokens/output_tokens) and older
 * (prompt_tokens/completion_tokens) OpenAI usage formats.
 * 
 * @param response - OpenAI response object
 * @returns Canonical Usage object or undefined if no usage data
 * 
 * @example
 * ```typescript
 * const response = {
 *   // ... other fields
 *   usage: {
 *     prompt_tokens: 10,
 *     completion_tokens: 20,
 *     total_tokens: 30
 *   }
 * };
 * 
 * usageFromOpenAI(response);
 * // {promptTokens: 10, completionTokens: 20, totalTokens: 30}
 * ```
 */
export function usageFromOpenAI(response: unknown): Usage | undefined {
  if (!hasUsage(response)) {
    return undefined;
  }

  const usage = response.usage;

  // Extract tokens, handling both old and new field names
  const promptTokens = usage.input_tokens ?? usage.prompt_tokens;
  const completionTokens = usage.output_tokens ?? usage.completion_tokens;
  const totalTokens = usage.total_tokens;

  // Return undefined if no token data at all
  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return {
    promptTokens: typeof promptTokens === 'number' ? promptTokens : undefined,
    completionTokens: typeof completionTokens === 'number' ? completionTokens : undefined,
    totalTokens: typeof totalTokens === 'number' ? totalTokens : undefined,
  };
}

/**
 * Extract text content from any OpenAI response format
 * 
 * This function handles multiple response formats:
 * 1. Text response: `output_text` field (legacy)
 * 2. Chat completion: `choices[0].message.content`
 * 3. Structured output: `output[].content[].text` (concatenated)
 * 
 * @param response - OpenAI response object
 * @returns Extracted text content or empty string
 * 
 * @example
 * ```typescript
 * // Text response
 * contentFromOpenAI({output_text: 'Hello'}) // 'Hello'
 * 
 * // Chat completion
 * contentFromOpenAI({
 *   choices: [{message: {content: 'Hello'}}]
 * }) // 'Hello'
 * 
 * // Structured output
 * contentFromOpenAI({
 *   output: [{
 *     content: [{text: 'Hello'}, {text: 'World'}]
 *   }]
 * }) // 'Hello\nWorld'
 * ```
 */
export function contentFromOpenAI(response: unknown): string {
  if (!response || typeof response !== 'object') {
    return '';
  }

  // Try text response format (legacy)
  if (isTextResponse(response)) {
    return response.output_text;
  }

  // Try chat completion format
  if (isChatCompletionResponse(response)) {
    const firstChoice = response.choices[0];
    if (firstChoice.message.content) {
      return firstChoice.message.content;
    }
    return '';
  }

  // Try structured output format
  if (isStructuredResponse(response)) {
    const parts: string[] = [];

    for (const outputItem of response.output) {
      if (!outputItem.content || !Array.isArray(outputItem.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (contentItem.text && typeof contentItem.text === 'string') {
          parts.push(contentItem.text);
        }
      }
    }

    return parts.join('\n');
  }

  // Unknown format - return empty string
  return '';
}

/**
 * Apply canonical response changes back to OpenAI text response
 * 
 * Mutates the raw response object to reflect changes made in hooks.
 * Only applies to responses with `output_text` field.
 * 
 * @param raw - Raw OpenAI response object (will be mutated)
 * @param content - New content to apply
 * 
 * @internal
 */
export function applyContentToTextResponse(raw: unknown, content: string): void {
  if (!isTextResponse(raw)) {
    return;
  }

  // Only update if content actually changed
  if (raw.output_text !== content) {
    raw.output_text = content;
  }
}

/**
 * Apply canonical response changes back to OpenAI chat completion
 * 
 * Mutates the raw response object to reflect changes made in hooks.
 * Updates the first choice's message content.
 * 
 * @param raw - Raw OpenAI response object (will be mutated)
 * @param content - New content to apply
 * 
 * @internal
 */
export function applyContentToChatResponse(raw: unknown, content: string): void {
  if (!isChatCompletionResponse(raw)) {
    return;
  }

  const firstChoice = raw.choices[0];
  if (!firstChoice.message) {
    return;
  }

  // Only update if content actually changed
  if (firstChoice.message.content !== content) {
    firstChoice.message.content = content;
  }
}