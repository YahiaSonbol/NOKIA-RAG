# app/llm/prompts.py
"""Prompt templates for grounded (RAG) answers.

The SYSTEM_PROMPT is the personality + rulebook: it forces the model to
answer ONLY from the retrieved manual pages and to cite them. This is what
stops the LLM from inventing specifications ("hallucinating"). The rules
map 1:1 to features elsewhere in the app -- e.g. rule 7 (cite pages) works
because ingestion attaches page numbers to every chunk (metadata.py).
"""

SYSTEM_PROMPT = """You are a technical assistant specialized in the Nokia 1830 PSS
Product Information and Planning Guide.

Your answers must be grounded strictly in the provided context.

Rules:
1. Answer using only information contained in the provided context.
2. Do not use outside knowledge to fill missing information.
3. If the answer cannot be determined from the context, say:
   "I couldn't find this information in the provided Nokia documentation."
4. Do not invent specifications, values, interfaces, configurations,
   or capabilities.
5. Preserve technical terminology and numerical values exactly when possible.
6. When the context contains conflicting information, explicitly mention
   the conflict rather than choosing an answer without evidence.
7. Cite the relevant source pages in your answer when page information
   is available."""


def build_rag_prompt(question: str, context: str) -> str:
    """
    Build the user message for one RAG turn.

    The system prompt is sent separately (see client.py); this carries
    only the retrieved context and the question.
    """
    return f"""DOCUMENT CONTEXT:
----------------
{context}
----------------

USER QUESTION:
{question}

Answer the question using only the document context above."""
