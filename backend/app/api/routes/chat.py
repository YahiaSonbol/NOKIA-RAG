# app/api/routes/chat.py
"""The single chat endpoint: POST /api/chat (online flow, all steps).

This is where the online flow is orchestrated, once per user prompt:

    retrieve (vector search) -> rerank (cross-encoder) -> build prompt
    -> stream LLM answer back as Server-Sent Events (SSE)

SSE is a plain HTTP response that stays open; the body is a series of
`event: X\\ndata: {...}\\n\\n` frames the frontend parses incrementally.
The frontend reader for this exact format lives in api/chat-slice.ts.
"""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.llm.client import stream_answer
from app.retrieval.context import build_context
from app.retrieval.reranker import rerank
from app.retrieval.retriever import retrieve

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Vector search is fast but coarse -> fetch extra candidates,
# then the cross-encoder reranker keeps only the best top_k.
CANDIDATES_PER_FINAL = 4


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=20)


def _sse(event: str, data: object) -> str:
    """Format one Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("")
async def chat(request: ChatRequest) -> StreamingResponse:
    """Ask a question and receive the answer as a stream of SSE events.

    Event order:
      sources : metadata of the retrieved chunks (for showing citations)
      token   : one small piece of the answer text (repeated)
      done    : the answer is complete
      error   : something failed; the stream closes right after
    """

    async def event_stream():
        try:
            question = request.question.strip()

            # 1. Retrieve candidates, then rerank down to top_k
            #    (both are sync work -> run in a thread so the event
            #    loop stays free for streaming).
            candidates = await asyncio.to_thread(
                retrieve, question, request.top_k * CANDIDATES_PER_FINAL
            )
            hits = await asyncio.to_thread(rerank, question, candidates, request.top_k)
            context = build_context(hits)

            # 2. Tell the frontend which sources back the answer.
            yield _sse(
                "sources",
                [
                    {
                        "id": hit["id"],
                        "score": hit["score"],
                        "rerank_score": hit.get("rerank_score"),
                        **hit["metadata"],
                    }
                    for hit in hits
                ],
            )

            # 3. Stream the answer token by token.
            async for delta in stream_answer(question, context):
                yield _sse("token", {"text": delta})

            yield _sse("done", {})
        except Exception as exc:  # surface failures inside the stream
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # stop reverse proxies from buffering
        },
    )
