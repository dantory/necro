#!/bin/bash
# V-77b/V-78 회귀 확인 — 고른 칸의 테가 이름을 밟나 + 트리 자들 + 전체 자.
#   bash tools/v78_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v78_selink.mjs                 # 고른 칸 테 ↔ 이름 (V-77b)
node tools/v78_selink.mjs 1366 700        # 낮은 창에서도
node tools/tree_fit.mjs 1512 863 tmp/v78_fit.png   # 트리가 창 안에 그대로 드는가
node tools/v77_hit.mjs                    # 단추가 온전히 눌리는가 (V-77)
node tools/qa_all.mjs
