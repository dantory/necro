#!/bin/bash
# V-67 회귀 확인 — 도킹 바닥 자 + 도킹 폭 자(V-66) + 빠른 자 전부.  bash tools/v67_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v67_dockfoot.mjs
node tools/v66_dockfill.mjs
node tools/qa_all.mjs
