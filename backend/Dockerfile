FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding + rerank models into the image so the first
# /api/chat doesn't stall for minutes (which resets browser connections).
ENV HF_HOME=/app/.hf_cache
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L6-v2')"

# Copy application
COPY app ./app
COPY scripts ./scripts

# Create data directories
RUN mkdir -p data/documents data/processed

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]