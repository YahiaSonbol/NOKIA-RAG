"""Backend entry point (what `uvicorn app.main:app` runs).

The app has two halves that never meet at runtime:

  1. INGESTION (offline, run by hand) -- backend/app/ingestion/ turns the
     Nokia PDF into vectors inside Pinecone. See scripts/ingest.py.
  2. CHAT (online, per request) -- backend/app/api/routes/chat.py receives a
     question, retrieves manual pages, and streams a grounded LLM answer.

On startup we preload the ML models (embedding + reranker) so the first
user request is not slowed down by a ~40s model load.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router

logger = logging.getLogger(__name__)

app = FastAPI(title="Nokia RAG API")


@app.on_event("startup")
def preload_models() -> None:
    """Load the embedding + rerank models at startup, not on first request.

    Without this, the first /api/chat pays a ~1 minute model-loading cost,
    which looks like a dead connection to the browser. Non-fatal: if the
    preload fails the models simply load lazily on first request instead.
    """
    try:
        from app.ingestion.embedder import _get_model as get_embedder
        from app.retrieval.reranker import _get_model as get_reranker

        get_embedder()
        get_reranker()
        logger.info("ML models preloaded - ready to serve.")
    except Exception:
        logger.exception("Model preload failed - falling back to lazy load.")

# The Next.js frontend runs on another origin -> allow its requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
