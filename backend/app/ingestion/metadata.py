# app/ingestion/metadata.py
"""Build clean metadata dicts attached to every chunk.

Each vector in Pinecone carries a small metadata record next to it.
Search results return the metadata (the raw text rides inside it too, put
there by the pipeline), so this metadata is what the UI's citation chips
and the prompt builder actually see. Page numbers here are what make
"see page 164" citations possible.
"""

from typing import Any


def build_metadata(
    document_id: str,
    document_name: str,
    chunk_index: int,
    page_number: int | None = None,
    section: str | None = None,
    subsection: str | None = None,
    content_type: str = "text",
) -> dict[str, Any]:
    """
    Assemble the metadata for one chunk.

    Pinecone metadata values must be strings, numbers, booleans or lists of
    strings -- never None -- so missing fields are dropped instead of kept.
    """
    metadata = {
        "document_id": document_id,
        "document_name": document_name,
        "chunk_index": chunk_index,
        "page_number": page_number,
        "section": section,
        "subsection": subsection,
        "content_type": content_type,
    }

    return {key: value for key, value in metadata.items() if value is not None}
