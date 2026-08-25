#!/bin/bash
# V-73 회귀 확인 — 능력치 창 폭(후/전) + 그 창을 같이 쓰는 자 전부 + 빠른 자.
#   bash tools/v73_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v73_statwide.mjs               # 후/전을 한 판에서 (인물 줄 빈폭 · 칸 · 접힘 · 잘림)
node tools/v56_statfold.mjs               # 수치가 한 줄도 안 숨는가 (V-56)
node tools/v66_dockfill.mjs               # 줄 안에서 이름과 값이 밟는가 (V-66)
node tools/v72_belt.mjs                   # 납작한 칸 바닥값 (V-72)
node tools/v71_dollmid.mjs                # 인물 중심선 (V-71)
node tools/doll_shape.mjs                 # 슬롯 비율
node tools/bagfit_qa.mjs                  # 반대쪽 — 가방이 안 밀렸는가
node tools/statup_qa.mjs                  # 강화 단추가 살아 있는가
node tools/qa_all.mjs
