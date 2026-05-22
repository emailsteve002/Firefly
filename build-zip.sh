#!/usr/bin/env bash
# Build a Chrome Web Store upload zip from this folder.
# Includes only the files that ship inside the extension.
# Output: ../firefly-<version>.zip (one level above this folder).

set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
OUT="../firefly-${VERSION}.zip"

rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  popup.html \
  popup.js \
  guide.html \
  README.md \
  src \
  img \
  -x "*.DS_Store" > /dev/null

echo ""
echo "Built: $(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
echo ""
echo "Contents:"
unzip -l "$OUT"
