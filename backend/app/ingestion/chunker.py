# app/ingestion/chunker.py
"""STAGE 2 of ingestion -- split pages into retrieval-ready chunks.

Why chunk at all? An embedding vector captures the MEANING of one text;
a whole manual page is too long and mixes topics, so search quality drops.
Smaller chunks (~450 words) are precise; the overlap between consecutive
chunks makes sure a sentence cut in half still appears complete somewhere.
"""

from typing import Any

from app.config import settings
from app.ingestion.metadata import build_metadata

CHUNK_SIZE = settings.chunk_size        # max words per chunk (overlap included)
CHUNK_OVERLAP = settings.chunk_overlap  # words shared between consecutive chunks

# Boundaries tried from most to least meaningful.
SEPARATORS = ["\n\n", "\n", ". ", " "]


def chunk_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Convert loaded documents into retrieval-ready chunks.

    Accepts documents shaped like either:
      {"text": "...", "source": "..."}                      (flat, from loader)
      {"document_id", "document_name", "sections": [...]}   (richer form)

    Returns: [{"id", "text", "metadata"}]
    """
    chunks = []

    for document in documents:
        document_name = (
            document.get("document_name")
            or document.get("source")
            or "document"
        )
        document_id = document.get("document_id") or _slugify(document_name)

        # No sections provided -> treat the whole text as one section.
        sections = document.get("sections") or [{"text": document.get("text", "")}]

        chunk_index = 0

        for section in sections:
            for piece in _split_section(section):
                metadata = build_metadata(
                    document_id=document_id,
                    document_name=document_name,
                    chunk_index=chunk_index,
                    page_number=section.get("page_number"),
                    section=section.get("section"),
                    subsection=section.get("subsection"),
                    content_type=section.get("content_type", "text"),
                )

                chunks.append(
                    {
                        "id": f"{document_id}_{chunk_index:05d}",
                        "text": piece,
                        "metadata": metadata,
                    }
                )

                chunk_index += 1

    return chunks


def _split_section(section: dict[str, Any]) -> list[str]:
    """Return the list of chunk texts for one section (no metadata yet)."""
    text = (section.get("text") or "").strip()
    if not text:
        return []
    return _apply_overlap(_split_text(text))


def _split_text(text: str) -> list[str]:
    """
    Split text into pieces that each fit CHUNK_SIZE words (no overlap yet).

    Tries separators from most to least meaningful. A part that is still
    too big after splitting is recursively split with finer separators.
    """
    if _token_count(text) <= CHUNK_SIZE:
        return [text]

    for separator in SEPARATORS:
        parts = [part.strip() for part in text.split(separator) if part.strip()]

        if len(parts) < 2:
            continue  # separator not present in this text, try a finer one

        # Leave room so overlap can be added later without exceeding CHUNK_SIZE.
        budget = CHUNK_SIZE - CHUNK_OVERLAP

        pieces: list[str] = []
        current = ""

        for part in parts:
            if _token_count(part) > CHUNK_SIZE:
                # One part alone is still oversized -> split it further.
                if current:
                    pieces.append(current)
                    current = ""
                pieces.extend(_split_text(part))  # recursion
                continue

            candidate = f"{current}{separator}{part}" if current else part

            if _token_count(candidate) <= budget:
                current = candidate
            else:
                pieces.append(current)
                current = part

        if current:
            pieces.append(current)

        if pieces:
            return pieces

    # Last resort: fixed word windows (handles texts with no separators).
    return _split_by_tokens(text)


def _apply_overlap(pieces: list[str]) -> list[str]:
    """Prepend the tail of the previous chunk to each chunk except the first."""
    result = []

    for index, piece in enumerate(pieces):
        if index > 0:
            room = CHUNK_SIZE - _token_count(piece)
            if room > 0:
                previous_words = pieces[index - 1].split()
                overlap_words = previous_words[-min(CHUNK_OVERLAP, room) :]
                piece = " ".join(overlap_words) + " " + piece

        result.append(piece)

    return result


def _split_by_tokens(text: str) -> list[str]:
    """Hard word-window split with overlap (fallback for separator-less text)."""
    if CHUNK_OVERLAP >= CHUNK_SIZE:
        raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE")

    words = text.split()
    pieces = []
    start = 0

    while start < len(words):
        pieces.append(" ".join(words[start : start + CHUNK_SIZE]))

        if start + CHUNK_SIZE >= len(words):
            break  # this window already reaches the end of the text

        start += CHUNK_SIZE - CHUNK_OVERLAP

    return pieces


def _slugify(name: str) -> str:
    """Turn a file name into a safe id prefix, e.g. 'Nokia 5G.pdf' -> 'nokia-5g-pdf'."""
    slug = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "document"


def _token_count(text: str) -> int:
    """
    Approximate token count using words.

    Replace with the embedding model's tokenizer when finalizing the pipeline.
    """
    return len(text.split())
