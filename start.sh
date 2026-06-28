#!/bin/bash
set -e

echo "[start] Installing Python dependencies..."
pip install -r news/requirements.txt --quiet

# Use the system Chromium (from replit.nix pkgs.chromium) so Playwright
# doesn't try to use its own bundled binary which is missing Nix lib deps.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(which chromium || which chromium-browser || echo "")

if [ -z "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" ]; then
  echo "[start] WARNING: system chromium not found, falling back to playwright install"
  python -m playwright install chromium 2>/dev/null || true
else
  echo "[start] Using system Chromium at $PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"
fi

echo "[start] Starting FastAPI news backend on port 8000..."
cd news
DB_PATH=./news.db OUT_DIR=./out python -m uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1 &
cd ..

echo "[start] Starting Express + Vite on port 3001..."
npm run dev &

wait -n
