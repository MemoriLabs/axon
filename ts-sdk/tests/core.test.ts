import { describe, expect, test } from "vitest";

import { Axon } from "../src/core.js";
import type { LLMAdapter } from "../src/adapters.js";
import type { LLMRequest, LLMResponse, Message } from "../src/types.js";

class DummyAdapter implements LLMAdapter {
  lastRequest?: LLMRequest;

  async call(request: LLMRequest): Promise<LLMResponse> {
    this.lastRequest = request;
    return { content: request.messages.at(-1)?.content ?? "" };
  }
}

test("runs tasks in order and mutates request/response", async () => {
  const adapter = new DummyAdapter();

  const axon = new Axon({
    adapter,
    tasks: [
      {
        before_call: (req) => {
          const last = req.messages.at(-1)!;
          const msg: Message = { role: last.role, content: `pre:${last.content}` };
          return { ...req, messages: [...req.messages.slice(0, -1), msg] };
        },
      },
      {
        after_call: (_req, resp) => ({ ...resp, content: `${resp.content}:post` }),
      },
    ],
  });

  const resp = await axon.call({ messages: [{ role: "user", content: "hi" }] });

  expect(adapter.lastRequest?.messages.at(-1)?.content).toBe("pre:hi");
  expect(resp.content).toBe("pre:hi:post");
});

describe("postCallBackground", () => {
  test("returns response without waiting for after hooks", async () => {
    let ran = false;
    const adapter = new DummyAdapter();
    const axon = new Axon({
      adapter,
      config: { postCallBackground: true },
      tasks: [
        {
          after_call: async () => {
            await new Promise((r) => setTimeout(r, 10));
            ran = true;
          },
        },
      ],
    });

    const resp = await axon.call({ messages: [{ role: "user", content: "hi" }] });
    expect(resp.content).toBe("hi");

    await new Promise((r) => setTimeout(r, 30));
    expect(ran).toBe(true);
  });
});
