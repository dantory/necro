#!/bin/bash
# V-65 회귀 확인 — 배어나오는 바 자(전/후 한 판) + 빠른 자 전부.  bash tools/v65_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v65_bornbar.mjs
node tools/qa_all.mjs
