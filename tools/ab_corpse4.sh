#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **드는 값** — 시체 과잉의 마지막 갈래. 앞의 셋은 전부 **쓰는 곳**을 건드렸다:
#   ㉠ 몰수(ab_corpse.sh)   — 시체는 줄었으나 깊이가 19% 깎였다(버리는 것이라).
#   ㉡ 배수구(ab_corpse2.sh) — 문턱을 낮춰도 한 입이 한 구라 140 붙박이.
#   ㉢ 환전(ab_corpse3.sh)   — 채택(NOVA_GULP_DIV=8). 상한 포화는 사라졌지만
#                              **「시체없음」은 여전히 0초**다 — 남아도는 것은 그대로다.
#
# 남은 답: **드는 값**이다. 유입은 층이 깊어질수록 늘어나는데 소환 값은 늘 1 구라,
# 어느 깊이부터는 무슨 짓을 해도 남는다. 값을 **몸 STEP 기마다 +1 구**로 두면
# 유입과 같은 축(깊이=군세)에서 값이 따라 오른다(js/battle.js SUMMON_COST_STEP).
#
#   ㉠ base   — STEP 0 (지금 그대로)   … 닻. 「시체없음 0초」가 다시 나오는지 본다
#   ㉡ step10 — 몸 10 기마다 +1 구      … 순한 쪽(몸 30 이면 4 구)
#   ㉢ step6  — 몸 6 기마다 +1 구       … 센 쪽(몸 30 이면 6 구)
#
# 끝 조건(ROADMAP G): **「시체없음」이 자리 빈 시간의 15% 이상**이 되면서
#   **최고층 합이 안 떨어질 것**. 값만 올리고 깊이가 깎이면 ㉠ 몰수와 같은 실패다.
# 씨앗 3·9·5 · 12분. 코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d)
cp js/battle.js "$BK"/
restore() { cp "$BK"/battle.js js/battle.js; }
trap restore EXIT

arm() {                                   # arm <이름>
  for s in 3 9 5; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/c4_$1_$s.json" 2>&1 \
      | grep -E "^12분|^ 12분|뒷정리 군세|자리가 빈 채로|^errors:"
  done
}

step() {                                  # step <STEP>
python3 - "$1" <<'PY'
import pathlib, sys
p = pathlib.Path("js/battle.js"); s = p.read_text()
mark = "export const SUMMON_COST_STEP = 0;"
assert mark in s, "battle.js 의 소환 값 손잡이가 바뀌었다"
p.write_text(s.replace(mark, "export const SUMMON_COST_STEP = %s;" % sys.argv[1], 1))
PY
}

restore;           arm base
restore; step 10;  arm step10
restore; step 6;   arm step6

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
