#!/bin/bash
# V-66 회귀 확인 — 도킹 폭 자(전/후 한 판) + 빠른 자 전부.  bash tools/v66_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v66_dockfill.mjs
node tools/qa_all.mjs
