# app/ingestion/loader.py
"""STAGE 1 of ingestion -- PDF to markdown, one section per page.

Ingestion runs OFFLINE (you trigger it from the CLI); the chat API never
touches PDFs. This file converts the Nokia PDF into markdown and splits it
at explicit page markers, so every chunk created later remembers which
manual page it came from -- that is what powers the page citations.
"""

import re
from pathlib import Path

from opendataloader_pdf import convert

OUTPUT_DIR = Path("data/processed")

# Written between consecutive pages, letting us keep page numbers.
PAGE_SEPARATOR = "\n<<<PAGE>>>\n"

# Markdown image references (e.g. ![](<images/imageFile1.png>)) are
# meaningless as retrieval text, so they are stripped.
IMAGE_REF_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")


def load_documents(
    pdf_path: str | Path,
    pages: str | None = None,
) -> list[dict]:
    """
    Convert a PDF to markdown and return it as page-aware document dicts.

    Args:
        pdf_path: Path to the PDF file.
        pages: Optional page range like "1-40" for partial ingestion.
            Page numbers assume the range starts at page 1.

    Returns:
        A list with one document per markdown file:
        {"document_name", "sections": [{"text", "page_number"}]}.

    Note:
        opendataloader writes the .md file only after the WHOLE page
        range has been processed -- an interrupted run leaves images
        but no markdown.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    convert(
        input_path=[str(pdf_path)],
        output_dir=str(OUTPUT_DIR),
        format="markdown",
        pages=pages,
        markdown_page_separator=PAGE_SEPARATOR,
        quiet=False,  # show the converter's progress and errors in the CLI
    )

    documents = []
    for md_file in sorted(OUTPUT_DIR.glob("*.md")):
        raw = md_file.read_text(encoding="utf-8")
        parts = raw.split(PAGE_SEPARATOR)
        page_offset = 1 if parts and parts[0].strip() else 0

        # One section per page.
        sections = []
        for position, page_text in enumerate(parts):
            cleaned = IMAGE_REF_RE.sub("", page_text).strip()
            if not cleaned:
                continue  # empty page (e.g. a cover page of pure images)
            sections.append(
                {
                    "text": cleaned,
                    "page_number": position + page_offset,
                }
            )

        if sections:
            documents.append(
                {"document_name": md_file.name, "sections": sections}
            )

    if not documents:
        raise RuntimeError(
            "The PDF was converted but no markdown file was produced in "
            f"{OUTPUT_DIR}. The conversion was probably interrupted."
        )
    return documents
