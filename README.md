<div align="center">

# Nokia 1830 PSS — RAG Assistant

**Chat with the manual.** Grounded answers from 1,568 pages of Nokia 1830 PSS
documentation — streamed in real time, with page-level citations.

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![Pinecone](https://img.shields.io/badge/Pinecone-vector%20DB-1C1E54)](https://www.pinecone.io/)

<img src="docs/screenshot_welcome.png" alt="Welcome screen" width="49%" />
<img src="docs/screenshot_chat.png" alt="Chat with grounded answer and citations" width="49%" />

</div>

---

##  Features

- **Grounded answers** — the LLM answers *only* from retrieved manual pages and refuses to invent specifications
- **Page-level citations** — every answer links back to the exact PDF pages it was built from
- **Real-time streaming** — token-by-token responses over Server-Sent Events
- **Transparent retrieval** — watch the reranked sources appear while the model thinks, and expand them
- **Two-stage retrieval** — fast vector search over 384-dim embeddings, then cross-encoder reranking for precision
- **One-command deployment** — Docker Compose with health-checked startup ordering

##  Architecture

```
                        ┌─────────────────────────────────────┐
                        │  OFFLINE (run once per document)    │
                        │                                     │
  Nokia PDF ──► loader ─┴─► chunker ──► embedder ──► Pinecone
  (1,568 pages)  page-aware   ~450-word   MiniLM       384-dim
                 markdown      chunks      vectors     vectors
```

```
                        ┌─────────────────────────────────────┐
                        │  ONLINE (every user prompt)         │
                        │                                     │
 question ──► embed ──► Pinecone search ──► cross-encoder ──► top-5 chunks
                                                                    │
        streamed answer ◄── MiniMax M3 (OpenRouter) ◄── grounded prompt
                (SSE: sources → token* → done)
```

**Why two retrieval stages?** Vector search compares embeddings computed
independently — fast but coarse. The cross-encoder reads the question and
each candidate *together*, so re-ranking just the top candidates gives
much better ordering at a fraction of the cost of re-scoring everything.

##  Getting started

### Prerequisites

- Docker **or** Python 3.12 + Node.js 22
- A [Pinecone](https://www.pinecone.io/) account (free tier works)
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Configure

```bash
cp backend/.env.example backend/.env
# then fill in PINECONE_KEY and OPENROUTER_API_KEY
```

### 2. Place the document

Put the PDF at `backend/data/documents/1830_Technical_Description.pdf`
(any PDF works — the pipeline is document-agnostic).

### 3. Run

```bash
docker compose up -d --build
```

The backend ingests nothing automatically — ingest your document once:

```bash
docker compose exec backend python scripts/ingest.py 1-40   # test pages
docker compose exec backend python scripts/ingest.py        # full document
```

Then open **http://localhost:3000** and ask a question.

<details>
<summary>Run without Docker</summary>

```bash
# terminal 1 — backend
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in keys
.venv/bin/uvicorn app.main:app --reload --port 8000

# terminal 2 — frontend (proxies /api and /health to :8000)
cd frontend
npm install
npm run dev
```
</details>

##  API

The single chat endpoint streams `text/event-stream` frames:

```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the 1830 PSS?"}'
```

```
event: sources
data: [{"document_name": "...", "page_number": 60, "rerank_score": 6.14}]

event: token
data: {"text": "The 1830 PSS"}

event: done
data: {}
```

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Grounded answer, streamed as SSE |
| `/health` | GET | Liveness probe (powers the online dot in the UI) |

##  Project structure

```
├── backend/
│   ├── app/
│   │   ├── ingestion/     # PDF → markdown → chunks → embeddings (offline)
│   │   ├── database/      # Pinecone vector store
│   │   ├── retrieval/     # search, reranking, prompt context (online)
│   │   ├── llm/           # OpenRouter client + grounding prompts
│   │   ├── api/           # FastAPI routes (SSE chat endpoint)
│   │   └── config.py      # all knobs in one place
│   ├── scripts/ingest.py  # CLI entry point for ingestion
│   └── data/documents/    # put your PDF here (gitignored)
├── frontend/
│   ├── app/               # Next.js App Router pages (+ /debug diagnostics)
│   ├── api/               # Redux store, chat slice (SSE reader), RTK Query
│   ├── components/chat/   # sidebar, messages, input, welcome screen
│   └── components/ui/     # shadcn-style primitives
└── compose.yaml
```

##  Configuration

All knobs live in `backend/app/config.py` / `backend/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `PINECONE_KEY` | — | Pinecone API key (**required**) |
| `OPENROUTER_API_KEY` | — | OpenRouter API key (**required**) |
| `chunk_size` / `chunk_overlap` | 450 / 60 words | Chunking granularity |
| `embedding_model` | all-MiniLM-L6-v2 | 384-dim sentence embeddings |
| `llm_model` | minimax/minimax-m3:free | Any OpenRouter chat model |
| `rerank_model` | ms-marco-MiniLM-L-6-v2 | Cross-encoder reranker |

##  Troubleshooting

| Symptom | Fix |
|---|---|
| Badge says **Offline** | Backend still starting (models preload ~40 s) or backend not running — check `docker compose ps` |
| Answers feel slow | The free LLM tier is rate-limited; swap `llm_model` to a paid model in `config.py` |
| Wrong/no citations | Re-run ingestion for the affected pages; check vectors with `docker compose exec backend python -c "..."` |
| Port already in use | Stop whatever holds :3000/:8000 (`ss -tlnp \| grep 3000`) |

