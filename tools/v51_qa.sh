#!/bin/bash
# ★ 긴 검사는 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/chrome_guard.mjs
node tools/qa_all.mjs
echo "=== first_look ==="
node tools/first_look.mjs
