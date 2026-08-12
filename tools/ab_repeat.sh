#!/bin/bash
# **자를 먼저 믿을 수 있게** — 08:06 에 넣은 코드가 08:0x 에는 씨앗 3·9·5 에서 15·19·20(18.0)
# 이었는데, 30분 뒤 같은 코드·같은 씨앗이 15·15·15(15.0) 였다. 코드도 씨앗도 같은데 판이 달랐다.
# 짚이는 것은 **남아 있던 판**이다(loop_health 가 잘리면 탭을 두고 갔고, 한 시간 반 묵은 탭이
# 다섯 개 떠 있었다 — 같은 렌더러의 프레임을 나눠 먹는다). 그 탭 청소를 넣었으니,
# **이제 같은 팔을 두 번 넣어 같은 숫자가 나오는지부터 본다.** 코드는 손대지 않는다.
#
#   1회차 · 2회차 — 완전히 같은 코드 · 같은 씨앗(3·9·5) · 12분
#   두 회차의 최고층이 붙으면 자를 믿고, 갈리면 그 폭이 곧 「못 믿는 폭」이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1

for rep in 1 2; do
  for s in 3 9 5; do
    echo "───────── REP $rep · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/rp_${rep}_$s.json" 2>&1 | tail -12
  done
done

echo "═════ 끝 · $(date +%H:%M) ═════"
echo "남은 판: $(curl -s http://127.0.0.1:9333/json/list | grep -c '8774/index.html')"
git -C "$REPO" status --porcelain js/
