#!/bin/bash
# V-135 뒤 빠른 자 한 바퀴 (상인 툴팁 · 새 자 v134_shop 포함). ab_guard 가 스스로 떨어져 나간다 — run_detached 로 또 감싸지 말 것.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/chrome_guard.mjs
node tools/qa_all.mjs
