#!/bin/bash
# V-62 회귀 확인 — 결 자 + 빠른 자 전부.  bash tools/v62_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v62_grain.mjs
node tools/qa_all.mjs
