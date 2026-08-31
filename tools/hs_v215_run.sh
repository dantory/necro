#!/bin/bash
# V-215 — V-212 가 깐 「던전 암반」이 벽지다(격자 도장 + 검은 이음매). V-176 의 고침을 옮긴다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
python3 /Users/lbs/.openclaw/workspace/tools/opencode_safe_run.py \
  --timeout 2100 --cwd "$PWD" "$(cat /Users/lbs/.openclaw/workspace/tmp/hs_v215_prompt.md)"
