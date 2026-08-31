# app/llm/client.py
"""Async LLM client for OpenRouter (OpenAI-compatible API).

OpenRouter sits in front of many model providers; we use the free
MiniMax M3 model. Two functions matter:

  - generate_answer: one complete string (not used by the chat route)
  - stream_answer:   yields the answer piece by piece -- this is what
                     powers the live typing effect in the UI

Free-tier models sometimes return empty responses, so both retry.
"""

from collections.abc import AsyncIterator
import asyncio

from openai import AsyncOpenAI
from openai.types.chat import (
    ChatCompletionMessageParam,
    ChatCompletionSystemMessageParam,
    ChatCompletionUserMessageParam,
)

from app.config import settings
from app.llm.prompts import SYSTEM_PROMPT, build_rag_prompt

_client = AsyncOpenAI(
    base_url=settings.openrouter_base_url,
    api_key=settings.openrouter_api_key,
    timeout=settings.llm_timeout_seconds,  # never leave a stream hanging forever
)


def _messages(question: str, context: str) -> list[ChatCompletionMessageParam]:
    """Build the chat messages for one grounded turn."""
    system: ChatCompletionSystemMessageParam = {
        "role": "system",
        "content": SYSTEM_PROMPT,
    }
    user: ChatCompletionUserMessageParam = {
        "role": "user",
        "content": build_rag_prompt(question, context),
    }
    return [system, user]


async def generate_answer(
    question: str,
    context: str,
    model: str = settings.llm_model,
    temperature: float = settings.llm_temperature,
) -> str:
    """
    Answer a question grounded in the retrieved context.

    Args:
        question: The user's question.
        context: Retrieved document chunks, formatted as one string.
        model: OpenRouter model slug (default from config).
        temperature: Low value keeps answers factual and deterministic.

    Returns:
        The model's answer text.
    """
    # Free-tier providers occasionally return 200 with no choices --
    # retry a couple of times before giving up.
    last_error: RuntimeError | None = None
    for attempt in range(3):
        response = await _client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=_messages(question, context),
        )

        choice = response.choices[0] if response.choices else None
        if choice and choice.message and choice.message.content:
            return choice.message.content

        last_error = RuntimeError(
            f"Model returned an empty response (attempt {attempt + 1}/3)."
        )
        await asyncio.sleep(1.5 * (attempt + 1))  # small backoff

    raise last_error  # type: ignore[misc]


async def stream_answer(
    question: str,
    context: str,
    model: str = settings.llm_model,
    temperature: float = settings.llm_temperature,
) -> AsyncIterator[str]:
    """Yield the answer piece by piece as it is generated.

    Retries once if the stream fails before any text reached the user;
    free-tier providers occasionally drop the first request.
    """
    last_error: Exception | None = None

    for attempt in range(2):
        yielded_any = False
        try:
            stream = await _client.chat.completions.create(
                model=model,
                temperature=temperature,
                messages=_messages(question, context),
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:  # reasoning chunks have no content
                    yielded_any = True
                    yield delta.content

            if yielded_any:
                return
            last_error = RuntimeError(
                "The model returned an empty stream. Please try again."
            )
        except Exception as error:
            # Tokens already reached the user -> too late to retry silently.
            if yielded_any:
                raise
            last_error = error
            if attempt == 1:
                raise

        await asyncio.sleep(1.5)  # small backoff before the retry

    raise last_error  # type: ignore[misc]
