# scripts/ingest.py
"""Ingest a PDF into Pinecone from the command line.

Usage (from backend/):
    python scripts/ingest.py            # whole document
    python scripts/ingest.py 1-40       # only pages 1-40 (quick first pass)

This is the ONLY entry point for the offline flow. It is a plain sync
script (no asyncio) -- it just calls ingestion.pipeline.ingest_document.
"""

import sys
from pathlib import Path

# Running "python scripts/ingest.py" puts scripts/ on the import path,
# not backend/ -- add backend/ so "import app..." works from anywhere.
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.ingestion.pipeline import ingest_document

PDF_PATH = BASE_DIR / "data" / "documents" / "1830_Technical_Description.pdf"


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF file not found at {PDF_PATH}")

    pages = sys.argv[1] if len(sys.argv) > 1 else None
    if pages:
        print(f"Ingesting pages {pages} of {PDF_PATH.name} ...")
    else:
        print(f"Ingesting all of {PDF_PATH.name} (this can take a while) ...")

    chunks = ingest_document(str(PDF_PATH), pages=pages)
    print(f"Done: {len(chunks)} chunks stored.")


if __name__ == "__main__":
    main()
