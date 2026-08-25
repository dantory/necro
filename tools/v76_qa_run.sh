#!/bin/bash
# V-76 회귀 확인 — 하늘 단추(나가기·환생) + 그 자리를 같이 쓰는 창 자들 + 전체 자.
#   bash tools/v76_qa_run.sh
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
node tools/v76_sky.mjs                    # 하늘 단추가 띠·판에 안 잘리는가 (V-76)
node tools/v75_shot.mjs                   # 떠오르는 숫자가 위 띠를 안 밟는가 (V-75)
node tools/v74_jside.mjs                  # 일지 자리 (V-74)
node tools/v73_statwide.mjs               # 능력치 창 폭 (V-73)
node tools/bagfit_qa.mjs                  # 가방이 안 밀렸는가
node tools/qa_all.mjs
