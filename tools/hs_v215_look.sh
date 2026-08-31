#!/bin/bash
# V-215 눈으로 다시 보기 — 코드는 한 줄도 안 고친다. 배포 상태(WAKE 500)를
# 씨앗 셋으로 실제 걸으며 «네 순간»(빈 복도·방 진입·교전·처치 후) 컷만 모은다.
# V-212(암반 배경)·V-213(카메라 중앙)이 화면을 통째로 바꿨으니 감시가 직접 본다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
W=/Users/lbs/.openclaw/workspace/tmp
for s in 7 21 33; do
  echo "── 씨앗 $s ──"
  SEED=$s FLOOR_BUDGET=45000 WAKES=500 CUT_WAKE=500 node tools/hs_v207_walk.mjs || echo "씨앗 $s 실패(넘어감)"
  for n in 1 2 3 4; do
    [ -f tmp/hs_v207_walk$n.png ] && cp tmp/hs_v207_walk$n.png "$W/hs_v215_s${s}_$n.png" && rm -f tmp/hs_v207_walk$n.png
  done
done
ls -l $W/hs_v215_s*.png
