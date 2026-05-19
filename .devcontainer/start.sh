#!/bin/bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "=== Starting claude-mem worker on port 37777 ==="
exec bun plugin/scripts/worker-service.cjs --daemon
