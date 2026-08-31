#!/bin/bash
# V-219 — 적 화살이 바닥보다 어둡다(V-218 이 가독성을 잃었다). 다시 구워 밝기 자를 넘긴다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
python3 /Users/lbs/.openclaw/workspace/tools/opencode_safe_run.py \
  --timeout 2100 --cwd "$PWD" "$(cat /Users/lbs/.openclaw/workspace/tmp/hs_v219_prompt.md)"
