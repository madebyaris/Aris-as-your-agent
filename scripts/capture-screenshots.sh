#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-/opt/cursor/artifacts/screenshots}"
BASE_URL="${2:-http://localhost:3000}"
CHROME="${CHROME:-/usr/local/bin/google-chrome}"

mkdir -p "$OUT_DIR"

capture() {
  local name="$1"
  local url="$2"
  local extra_args="${3:-}"
  echo "Capturing $name → $OUT_DIR/$name.png"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --window-size=1440,900 \
    --screenshot="$OUT_DIR/$name.png" \
    $extra_args \
    "$url"
}

capture "home" "$BASE_URL/"
capture "projects" "$BASE_URL/projects"
capture "chat" "$BASE_URL/chat"

echo "Screenshots saved to $OUT_DIR"
