#!/bin/bash
set -e

echo "=== Installing Bun ==="
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "=== Installing dependencies ==="
bun install

echo "=== Installing Claude Code CLI ==="
npm install -g @anthropic-ai/claude-code

echo "=== Building claude-mem ==="
npm run build

echo "=== Setup complete ==="
echo "Run: bash .devcontainer/start.sh"
