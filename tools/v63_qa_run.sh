#!/bin/bash
# V-63 회귀 확인 — 글리프 자(양성 씨앗 점검 포함) + 빠른 자 전부.  bash tools/v63_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v63_glyph.mjs --all --selftest
node tools/qa_all.mjs
