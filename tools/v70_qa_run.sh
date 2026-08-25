#!/bin/bash
# V-70 회귀 확인 — 바닥 그림 눌림 자(후/전) + 빠른 자 전부.
#   bash tools/v70_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v70_flatfx.mjs               # 후 — 판의 눌림과 같아야 한다
V70_OLD=1 node tools/v70_flatfx.mjs     # 전(내 양성 씨앗 — 0.92 를 안 넘으면 자가 미달을 낸다)
node tools/qa_all.mjs
