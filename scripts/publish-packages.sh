#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

packages=(
  core
  react
  vue
  ui-react
  ui-vue
  nextjs
  ui-next
  signaling-server
)

echo "Installing deps with bun..."
bun install

echo "Building all packages..."
bun run build

echo "Publishing packages in order..."
for pkg in "${packages[@]}"; do
  echo "--- publishing ${pkg} ---"
  (cd "$ROOT_DIR/packages/${pkg}" && npm publish --access public "$@")
done

echo "Done."
