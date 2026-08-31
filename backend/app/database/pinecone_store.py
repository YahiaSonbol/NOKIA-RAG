"""Pinecone vector-store integration.

Pinecone is a managed "vector database": it stores the embedding vectors
produced during ingestion and, for any query vector, finds the stored
vectors that are numerically closest to it (cosine similarity). That is
how "which manual pages talk about X?" becomes a fast lookup.

This module owns the connection and the two operations the app needs:
creating the index once (dimension must match the embedding model) and
upserting records in batches.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from pinecone import Pinecone, ServerlessSpec

from app.config import settings


class PineconeVectorStore:
    def __init__(self) -> None:
        self.client = Pinecone(api_key=settings.pinecone_api_key)
        self.index_name = settings.pinecone_index_name
        self._ensure_index()
        self.index = self.client.Index(self.index_name)

    def upsert(
        self,
        records: list[dict[str, Any]],
        batch_size: int = settings.upsert_batch_size,
    ) -> int:
        total = 0
        for batch in _batched(records, batch_size):
            self.index.upsert(vectors=batch)
            total += len(batch)
        return total

    def _ensure_index(self) -> None:
        existing_names = {index.name for index in self.client.list_indexes()}
        if self.index_name in existing_names:
            return

        self.client.create_index(
            name=self.index_name,
            dimension=settings.embedding_dimension,
            metric="cosine",
            spec=ServerlessSpec(
                cloud=settings.pinecone_cloud,
                region=settings.pinecone_region,
            ),
        )


def _batched(items: list[dict[str, Any]], batch_size: int) -> Iterable[list[dict[str, Any]]]:
    if batch_size <= 0:
        raise ValueError("batch_size must be positive")

    for start in range(0, len(items), batch_size):
        yield items[start : start + batch_size]
