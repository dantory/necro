#!/bin/bash
# V-143 — 환생이 정말 벽을 못 미는가. 회차1 → 환생 → 회차2 를 씨앗 셋으로.
#   판정(자에 이미 박혀 있음): 회차2가 회차1보다 1.6배 이상 깊은가.
#   못 미는 것이 확인되면 그 자리가 「투자해서 벽을 넘는다」가 없는 뿌리다(V-138 ㉡㉢).
. "$(dirname "$0")/ab_guard.sh"
set -u
cd "$(dirname "$0")/.." || exit 1
node tools/chrome_guard.mjs || true
node tools/rebirth_qa.mjs 12 1,7,13 tmp/v143_rebirth.json
