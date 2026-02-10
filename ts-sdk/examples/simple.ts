import { Axon } from "../src/core.js";

const client = {
  responses: {
    async create(opts: any) {
      return { output_text: `echo:${opts.input[0].content}` };
    },
  },
};

const axon = new Axon({
  tasks: [
    {
      before_call: (req) => {
        const last = req.messages.at(-1)!;
        return { ...req, messages: [{ ...last, content: `pre:${last.content}` }] };
      },
      after_call: (_req, resp) => {
        console.log("Canonical response:", resp.content);
      },
    },
  ],
});

await axon.register(client);

const raw = await client.responses.create({
  model: "gpt-test",
  input: [{ role: "user", content: "Say hi" }],
});

console.log("Raw output_text:", raw.output_text);
