#!/bin/bash
# V-192 회귀 셋 — v192 작업이 시간 상한(rc=124)에 잘려 못 돌린 자리를 잇는다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "=== 1) hs_v186_tree 30 7 ==="
node tools/hs_v186_tree.mjs 30 7 2>&1 | tail -25
echo "=== 2) hs_v187_statval 30 7 ==="
node tools/hs_v187_statval.mjs 30 7 2>&1 | tail -25
echo "=== 3) hs_v190_xp ==="
node tools/hs_v190_xp.mjs 2>&1 | tail -25
echo "=== ALL REGRESSION DONE ==="
