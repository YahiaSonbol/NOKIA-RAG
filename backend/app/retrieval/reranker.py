# app/retrieval/reranker.py
"""Online flow, step 2 -- re-score candidates with a cross-encoder."""

from sentence_transformers import CrossEncoder

from app.config import settings

_model: CrossEncoder | None = None  # loaded lazily, once


def _get_model() -> CrossEncoder:
    """Load the rerank model on first use and reuse it afterwards."""
    global _model
    if _model is None:
        _model = CrossEncoder(settings.rerank_model)
    return _model


def rerank(question: str, hits: list[dict], top_k: int | None = None) -> list[dict]:
    """
    Re-order retrieved hits by true question-to-chunk relevance.

    Why bother? Vector search compares two embeddings computed
    SEPARATELY (question alone, chunk alone) -- fast but coarse.
    A cross-encoder reads the question and each chunk TOGETHER,
    so its relevance score is much more accurate. The usual trade:
    it is slower, so we only rerank the few candidates we already have.

    Args:
        question: The user's question.
        hits: [{"id", "score", "text", "metadata"}] from the retriever.
        top_k: Keep only the best N hits (None = keep all).

    Returns:
        The same hits, best-first, each with a new "rerank_score".
    """
    if not hits:
        return []

    # One pair per hit: the model reads question and chunk together.
    pairs = [(question, hit["text"]) for hit in hits]
    scores = _get_model().predict(pairs)

    for hit, score in zip(hits, scores):
        hit["rerank_score"] = float(score)

    hits.sort(key=lambda hit: hit["rerank_score"], reverse=True)

    return hits[:top_k] if top_k else hits
