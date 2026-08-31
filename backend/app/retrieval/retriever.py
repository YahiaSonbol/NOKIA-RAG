# app/retrieval/retriever.py
"""Online flow, step 1 -- find candidate chunks for a question.

Embeds the question with the SAME model used at ingestion time, then asks
Pinecone for the closest chunk vectors. Fast, but coarse: it compares two
independently-computed embeddings, so ordering among good candidates is
approximate. reranker.py fixes that next.
"""

from app.database.pinecone_store import PineconeVectorStore
from app.ingestion.embedder import embed_texts


def retrieve(question: str, top_k: int = 5) -> list[dict]:
    """
    Embed the question and return the top_k most similar chunks.

    Returns:
        [{"id", "score", "text", "metadata"}] ordered best-first.
    """
    vector = embed_texts([question])[0]

    store = PineconeVectorStore()
    response = store.index.query(vector=vector, top_k=top_k, include_metadata=True)

    hits = []
    for match in response.matches:
        metadata = dict(match.metadata or {})
        hits.append(
            {
                "id": match.id,
                "score": match.score or 0.0,
                "text": metadata.pop("text", ""),
                "metadata": metadata,
            }
        )

    return hits
