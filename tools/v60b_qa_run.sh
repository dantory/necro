#!/bin/bash
# V-60b 회귀 확인 — 빠른 자 전부.  bash tools/v60b_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/qa_all.mjs
