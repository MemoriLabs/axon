import { expect, test } from "vitest";

import { Axon } from "../src/core.js";

test("register patches openai-like client responses.create and preserves call shape", async () => {
  const responses = {
    create: async (opts: any) => ({ output_text: `ok:${opts.input[0].content}` }),
  };

  const client: any = { responses };

  const axon = new Axon({
    tasks: [
      {
        before_call: (req) => {
          const last = req.messages.at(-1)!;
          return { ...req, messages: [{ ...last, content: `pre:${last.content}` }] };
        },
      },
    ],
  });

  await axon.register(client);

  const raw = await client.responses.create({
    model: "gpt-test",
    input: [{ role: "user", content: "hi" }],
  });

  expect(raw.output_text).toBe("ok:pre:hi");
});

test("register patches openai-like client chat.completions.create and preserves call shape", async () => {
  const completions = {
    create: async (opts: any) => ({
      choices: [{ message: { content: `ok:${opts.messages[0].content}` } }],
    }),
  };

  const client: any = { chat: { completions } };

  const axon = new Axon({
    tasks: [
      {
        before_call: (req) => {
          const last = req.messages.at(-1)!;
          return { ...req, messages: [{ ...last, content: `pre:${last.content}` }] };
        },
      },
    ],
  });

  await axon.register(client);

  const raw = await client.chat.completions.create({
    model: "gpt-test",
    messages: [{ role: "user", content: "hi" }],
  });

  expect(raw.choices[0].message.content).toBe("ok:pre:hi");
});
