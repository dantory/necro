#!/bin/bash
# V-64 회귀 확인 — 가방 빈바닥 자(전/후 한 판) + 빠른 자 전부.  bash tools/v64_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v64_baghole.mjs
node tools/qa_all.mjs
