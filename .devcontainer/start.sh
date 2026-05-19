#!/bin/bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "=== Starting claude-mem worker ==="
bun plugin/scripts/worker-service.cjs start

echo ""
echo "Worker started on port 37777"
echo "Check status: curl http://localhost:37777/api/health"
echo "Pipeline:     curl http://localhost:37777/api/business/pipeline"
