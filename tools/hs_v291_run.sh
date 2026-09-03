#!/bin/bash
# V-291 — 몬스터에 색을 조금 되돌린다 (덮개에서 액터만 살짝 빼기)
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
python3 /Users/lbs/.openclaw/workspace/tools/opencode_safe_run.py \
  --timeout 2400 --cwd "$PWD" "$(cat /Users/lbs/.openclaw/workspace/tmp/hs_v291_prompt.md)"
