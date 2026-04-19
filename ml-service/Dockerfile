FROM python:3.11-slim

WORKDIR /app

# System dependencies
# libgomp1  — required by faiss-cpu (OpenMP threading)
# ffmpeg    — required by openai-whisper for audio decoding
# curl      — health-check probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-train the model and build FAISS artifacts at image build time.
# This means every container starts with a warm, trained index —
# no cold-start training delay in production.
RUN python train_model.py

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the API server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
