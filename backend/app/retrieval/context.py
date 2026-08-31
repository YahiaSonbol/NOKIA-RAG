# app/retrieval/context.py
"""Online flow, step 3 -- assemble retrieved chunks into the prompt's context.

The LLM cannot see Pinecone; it only sees text. This file formats the
reranked hits into one numbered, labelled block that goes into the prompt.
The labels (document name + page) are what let the model cite sources,
as required by rule 7 of the system prompt.
"""


def build_context(hits: list[dict]) -> str:
    """
    Join retrieved hits into a numbered, labelled context block.

    The labels (document name + page) let the model cite sources,
    as required by rule 7 of the system prompt.
    """
    if not hits:
        return "No context was found for this question."

    parts = []
    for number, hit in enumerate(hits, start=1):
        metadata = hit.get("metadata", {})
        label = f"[{number}] {metadata.get('document_name', 'unknown document')}"

        page = metadata.get("page_number")
        if page is not None:
            label += f", page {page}"

        parts.append(f"{label}\n{hit.get('text', '').strip()}")

    return "\n\n".join(parts)
