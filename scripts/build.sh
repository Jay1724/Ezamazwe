#!/usr/bin/env bash
# Builds the combined Vercel deployment: the static marketing site at the
# root, plus the Learn portal SPA built into /learn.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.vercel_output"

cd "$ROOT_DIR/learn-portal"
npm install
npm run build

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Static marketing site
cp "$ROOT_DIR/index.html" "$OUT_DIR/"
cp "$ROOT_DIR/robots.txt" "$OUT_DIR/"
cp "$ROOT_DIR/sitemap.xml" "$OUT_DIR/"
cp -r "$ROOT_DIR/css" "$OUT_DIR/css"
cp -r "$ROOT_DIR/js" "$OUT_DIR/js"
cp -r "$ROOT_DIR/assets" "$OUT_DIR/assets"
cp -r "$ROOT_DIR/pages" "$OUT_DIR/pages"

# Learn portal SPA, served at /learn
mkdir -p "$OUT_DIR/learn"
cp -r "$ROOT_DIR/learn-portal/dist/." "$OUT_DIR/learn/"

echo "Build complete: $OUT_DIR"
