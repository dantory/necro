#!/bin/bash
# V-61 회귀 확인 — 빠른 자 전부.  bash tools/v61_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/qa_all.mjs
