# app/config.py
"""Central configuration, loaded from backend/.env.

Every tunable number of the pipeline lives here in one frozen dataclass:
chunk sizes, model names, batch sizes, timeouts. `settings` at the bottom
is the single instance every other module imports.

Secrets (PINECONE_KEY, OPENROUTER_API_KEY) are required -- the app refuses
to start without them, with a clear message naming the missing key.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")  # backend/.env


def _require(key: str) -> str:
    """Read a required environment variable or fail with a clear message."""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing {key} in backend/.env")
    return value


@dataclass(frozen=True)
class Settings:
    # Pinecone
    pinecone_api_key: str
    pinecone_index_name: str = "nokia-rag"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"

    # Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # Chunking (word counts; overlap must stay smaller than size)
    chunk_size: int = 450
    chunk_overlap: int = 60

    # Batching
    embed_batch_size: int = 64
    upsert_batch_size: int = 100

    # LLM via OpenRouter
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "minimax/minimax-m3:free"
    llm_temperature: float = 0.1
    llm_timeout_seconds: float = 120.0

    # Reranking (cross-encoder that re-scores retrieved chunks)
    rerank_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"


settings = Settings(
    pinecone_api_key=_require("PINECONE_KEY"),
    openrouter_api_key=_require("OPENROUTER_API_KEY"),
)
