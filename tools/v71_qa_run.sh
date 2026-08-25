#!/bin/bash
# V-71 회귀 확인 — 인물 중심선 자(후/전) + 빠른 자 전부.
#   bash tools/v71_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v71_dollmid.mjs                # 후 — 몸이 슬롯 축에서 2px 안
V71_OLD=1 node tools/v71_dollmid.mjs      # 전(내 양성 씨앗 — 6px 를 안 넘으면 자가 미달을 낸다)
node tools/doll_shape.mjs                 # 슬롯 비율(V-55 계열)이 안 무너졌는가
node tools/qa_all.mjs
