# app/ingestion/embedder.py
"""STAGE 3 of ingestion -- turn chunk text into embedding vectors.

An embedding is a list of 384 numbers that represents what a text MEANS.
Texts with similar meaning get vectors that point in similar directions,
which is what makes "search by meaning" possible later.

IMPORTANT: the chat flow (retriever.py) embeds questions with this SAME
model. Mixing models would make the vectors incomparable.
"""

from sentence_transformers import SentenceTransformer

from app.config import settings

_model: SentenceTransformer | None = None  # loaded lazily, once


def _get_model() -> SentenceTransformer:
    """Load the embedding model on first use and reuse it afterwards."""
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed_texts(
    texts: list[str],
    batch_size: int = settings.embed_batch_size,
) -> list[list[float]]:
    """
    Embed a list of texts.

    Args:
        texts: One string per chunk.
        batch_size: How many texts to encode at once.

    Returns:
        One vector (list of floats) per input text, same order.
    """
    if not texts:
        return []

    embeddings = _get_model().encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True,  # unit length -> cosine similarity works best
    )

    return [embedding.tolist() for embedding in embeddings]
