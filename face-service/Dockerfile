# ---------------------------------------------------------------------------
# Memory Companion — Face Service
# ---------------------------------------------------------------------------
# Uses Python 3.11-slim + apt build tools so dlib compiles cleanly.
# Build can take 5-10 min on first push (dlib compilation).
# Subsequent builds use Docker layer cache — fast if requirements.txt unchanged.
# ---------------------------------------------------------------------------

FROM python:3.11-slim

# Install dlib build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        cmake \
        build-essential \
        libopenblas-dev \
        liblapack-dev \
        libx11-dev \
        libgtk2.0-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
