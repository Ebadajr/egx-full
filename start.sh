#!/bin/bash
set -e

echo "[start] Installing Python dependencies..."
pip install -r news/requirements.txt --quiet

echo "[start] Installing Playwright Chromium..."
python -m playwright install chromium 2>/dev/null || true

echo "[start] Starting FastAPI news backend on port 8000..."
cd news
DB_PATH=./news.db OUT_DIR=./out python -m uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1 &
cd ..

echo "[start] Starting Express + Vite on port 3001..."
npm run dev &

wait -n
