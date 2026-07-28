FROM python:3.11-slim

WORKDIR /app

# Install core deps first for better layer caching. (.dockerignore keeps the
# local venv, caches, and .env secrets out of the build context.)
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# HuggingFace Spaces route to port 7860.
EXPOSE 7860

# One worker keeps the in-memory rate limiter accurate; threads give concurrency
# so a scan/enhance doesn't block other requests. Longer timeout for cold Semgrep.
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app", "--workers", "1", "--threads", "8", "--timeout", "120"]
