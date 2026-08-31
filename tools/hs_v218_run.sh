#!/bin/bash
# V-218 — 적 발사체 foeShots 가 아직 fillRect 주황 막대다. V-217(금)의 고침을 옮긴다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
python3 /Users/lbs/.openclaw/workspace/tools/opencode_safe_run.py \
  --timeout 2100 --cwd "$PWD" "$(cat /Users/lbs/.openclaw/workspace/tmp/hs_v218_prompt.md)"
