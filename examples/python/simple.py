from __future__ import annotations

import os

from dotenv import load_dotenv
from openai import OpenAI

from axon import Axon

load_dotenv()


def before(request, ctx):
    print("Before")
    return request


def after(request, response, ctx):
    print("After")
    return response


def main() -> None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Set OPENAI_API_KEY before running this example.")

    client = OpenAI(api_key=api_key)
    axon = Axon().llm.register(client)

    axon.before.register(before)
    axon.after.register(after)

    print("Say hi")

    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": "Say hi"}],
    )
    text = getattr(resp, "output_text", None)
    if not isinstance(text, str):
        text = resp.choices[0].message.content
    print(text)


if __name__ == "__main__":
    main()
