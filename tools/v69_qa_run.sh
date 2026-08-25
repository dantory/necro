#!/bin/bash
# V-69 회귀 확인 — 겹침 자(전/후) + 붙음 자(V-51) + 바 자(V-20) + 빠른 자 전부.
#   bash tools/v69_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v69_numlap.mjs 40            # 후
XLAP=0 node tools/v69_numlap.mjs 40     # 전(내 양성 씨앗 — 5% 를 안 넘으면 자가 미달을 낸다)
SEED=1 node tools/v51_runs.mjs 40       # 같은 빛깔이 붙는가 (V-51 이 안 되돌아왔나)
SEED=1 node tools/v20_overlap.mjs 40    # 옆으로 민 숫자가 체력바를 덮는가 (V-20)
node tools/qa_all.mjs
