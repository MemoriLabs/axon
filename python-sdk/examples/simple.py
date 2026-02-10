from __future__ import annotations

import os
import time

from dotenv import load_dotenv
from openai import OpenAI

from axon import Axon, AxonConfig, CallContext, LLMRequest, LLMResponse

load_dotenv()


def task(request: LLMRequest, ctx: CallContext, state: str, count: int) -> LLMRequest:
    print(f"[STATE: {state} | TASK {count}] Running task {count}")
    return request


class AddMarkers:
    def before_call(self, request: LLMRequest, ctx: CallContext) -> LLMRequest | None:
        for i in range(3):
            task(request, ctx, "before", i + 1)

        return None

    def after_call(
        self, request: LLMRequest, response: LLMResponse, ctx: CallContext
    ) -> LLMResponse | None:
        for i in range(3):
            task(request, ctx, "after", i + 1)

        return None


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

axon = Axon(
    tasks=[AddMarkers()],
    config=AxonConfig(
        post_call_background=True,
        background_max_workers=1,
        collect_hook_timings=True,
    ),
).register(client)

print("Say hi")

resp = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[{"role": "user", "content": "Say hi"}],
)
text = getattr(resp, "output_text", None)
if not isinstance(text, str):
    text = resp.choices[0].message.content
print(text)

time.sleep(3)

axon.show_latency("before")
axon.show_latency("after")
