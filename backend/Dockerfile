# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Reproducible, quiet, no .pyc noise; small pip footprint.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# Dependencies first so this layer is cached until requirements.txt changes.
# All deps ship manylinux wheels (asyncpg, cryptography, lxml, Pillow), so no
# apt build toolchain is needed — keeps the image small and the build fast.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code (.dockerignore keeps .env, .venv, tests, caches out).
COPY . .

# Run unprivileged.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Azure Container Apps routes ingress to the target port; the app honours $PORT.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
