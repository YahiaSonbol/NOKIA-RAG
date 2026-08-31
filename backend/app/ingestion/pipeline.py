# app/ingestion/pipeline.py
"""STAGE 4 -- the whole ingestion flow, chained.

    load (PDF -> pages) -> chunk -> embed -> upsert to Pinecone

This is the only file the CLI calls; the other ingestion modules are steps.
Run it with:  PYTHONPATH=. python scripts/ingest.py [pages]
"""

from typing import Any

from app.config import settings
from app.database.pinecone_store import PineconeVectorStore
from app.ingestion.chunker import chunk_documents
from app.ingestion.embedder import embed_texts
from app.ingestion.loader import load_documents


def ingest_document(
    pdf_path: str,
    pages: str | None = None,
) -> list[dict[str, Any]]:
    """
    Ingest one PDF and return the chunks that were stored.

    Args:
        pdf_path: Path to the PDF file.
        pages: Optional page range like "1-40" for partial ingestion.

    Steps:
      1. load_documents  -> [{"text", "source"}]
      2. chunk_documents -> [{"id", "text", "metadata"}]
      3. embed_texts     -> one vector per chunk
      4. build Pinecone records -> [{"id", "values", "metadata"}]
      5. upsert to the index
    """
    # 1. Extract text
    documents = load_documents(pdf_path, pages=pages)
    if not documents:
        raise ValueError(f"No text could be extracted from {pdf_path}")

    # 2. Split into retrieval-ready chunks
    chunks = chunk_documents(documents)
    if not chunks:
        raise ValueError(f"No chunks produced for {pdf_path}")

    # 3. Embed the chunk texts (same order as chunks)
    embeddings = embed_texts([chunk["text"] for chunk in chunks])

    # 4. Pinecone record shape: id + vector + metadata.
    #    The text rides along in the metadata: queries only return
    #    metadata, so this is how the retriever gets the content back.
    records = [
        {
            "id": chunk["id"],
            "values": embedding,
            "metadata": {**chunk["metadata"], "text": chunk["text"]},
        }
        for chunk, embedding in zip(chunks, embeddings)
    ]

    # 5. Store (batched)
    store = PineconeVectorStore()
    upserted = store.upsert(records, batch_size=settings.upsert_batch_size)

    print(f"Ingested {pdf_path}: {upserted} vectors upserted.")
    return chunks


if __name__ == "__main__":
    # Ingest from the command line, e.g.:
    #   python -m app.ingestion.pipeline path/to/document.pdf
    #   python -m app.ingestion.pipeline path/to/document.pdf 1-40
    import sys

    if len(sys.argv) not in (2, 3):
        print("Usage: python -m app.ingestion.pipeline <pdf_path> [pages]")
        raise SystemExit(1)

    ingest_document(sys.argv[1], pages=sys.argv[2] if len(sys.argv) == 3 else None)
