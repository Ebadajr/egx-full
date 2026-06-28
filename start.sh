#!/bin/bash
set -e

echo "[start] Installing Python dependencies..."
pip install -r news/requirements.txt --quiet

# Find system Chromium (from replit.nix pkgs.chromium)
CHROMIUM_BIN=$(which chromium 2>/dev/null || which chromium-browser 2>/dev/null || echo "")

if [ -n "$CHROMIUM_BIN" ]; then
  echo "[start] Found system Chromium at $CHROMIUM_BIN"
  # Patch app.py to pass executable_path so Playwright uses system chromium
  # instead of its bundled binary which is missing Nix lib deps (libnspr4.so etc)
  sed -i "s|pw\.chromium\.launch(headless=True)|pw.chromium.launch(headless=True, executable_path='$CHROMIUM_BIN')|g" news/app.py
  echo "[start] Patched news/app.py to use system Chromium"
else
  echo "[start] System chromium not found, using Playwright bundled binary"
fi

export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "[start] Starting FastAPI news backend on port 8000..."
cd news
DB_PATH=./news.db OUT_DIR=./out python -m uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1 &
cd ..

echo "[start] Starting Express + Vite on port 3001..."
npm run dev &

wait -n
