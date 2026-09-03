#!/bin/bash
# V-288 — ② 톤을 어둡고 탁하게(불이 화면에서 이기게) + ① UI 마감(구슬 잘림·판이 전장 덮음·글자 겹침)
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
python3 /Users/lbs/.openclaw/workspace/tools/opencode_safe_run.py \
  --timeout 2400 --cwd "$PWD" "$(cat /Users/lbs/.openclaw/workspace/tmp/hs_v288_prompt.md)"
