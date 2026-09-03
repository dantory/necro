#!/bin/bash
# V-290 — 불을 D2 의 불로: ㉠ 흰 코어→진한 주황(채도 9.3%→35%+) · ㉡ 작고 많게 흩뿌리기
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
python3 /Users/lbs/.openclaw/workspace/tools/opencode_safe_run.py \
  --timeout 2400 --cwd "$PWD" "$(cat /Users/lbs/.openclaw/workspace/tmp/hs_v290_prompt.md)"
