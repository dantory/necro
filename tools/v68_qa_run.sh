#!/bin/bash
# V-68 회귀 확인 — 바닥 이음매 자 + 빠른 자 전부.  bash tools/v68_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v68_wangedge.mjs
node tools/qa_all.mjs
