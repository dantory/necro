#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **못이 안 마르는 진짜 까닭** — 08-17 06:5x 에 소비를 갈라 재고서야 보였다.
# 12분 판(씨앗 3)의 시체 소비: [소환 277 · 폭발 4742 · 태우기 72 · 벽 512 · 제물 112]
#   → **폭발 하나가 열에 여덟**이고, 그 폭발이 무는 양은 `쌓인 몫/8`(NOVA_GULP_DIV)이다.
#
# 들어오는 양 i · 비례해서 무는 비율 p 라면 못은 **i/p 에 가서 선다** — 0 이 아니다.
# 아무리 크게 물어도 못이 줄면 무는 양도 같이 줄어 **스스로 그 자리를 지킨다**.
# 실측이 그대로다: 평균 106 구(상한 140 의 76%) · 「시체없음」 12분에 1~6초.
#   ㉠ 몰수·㉡ 배수구·㉢ 환전(=이 비례 무는 값)·㉣ 소환 값 — 넷이 다 실패한 까닭이 하나였다.
#   특히 ㉣(ab_corpse4)이 아무것도 안 바꾼 것은 **소환이 전체 소비의 2%** 여서다.
#
# 그래서 이번에는 **무는 양을 못 크기와 끊는다**(js/battle.js NOVA_GULP_FLAT):
#   ㉠ base   — FLAT 0 (지금 그대로 · 쌓인 몫/8)   … 닻
#   ㉡ flat16 — 한 입 늘 16 구 (평균 무는 양 14 근처라 «세기»는 거의 그대로)
#   ㉢ flat10 — 한 입 늘 10 구 (순한 쪽 — 마르긴 하되 화력을 덜 깎는지 본다)
#
# 끝 조건(ROADMAP G): **「시체없음」이 자리 빈 시간의 15% 이상** 이면서
#   **최고층 합이 안 떨어질 것**. 값만 맞추고 깊이가 깎이면 ㉠ 몰수와 같은 실패다.
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
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/c5_$1_$s.json" 2>&1 \
      | grep -E "^12분|^ 12분|뒷정리 군세|자리가 빈 채로|판 전체 막힘|못이 마른|못\(첫|얕은 쪽|^errors:"
  done
}

flat() {                                  # flat <구수>
python3 - "$1" <<'PY'
import pathlib, sys
p = pathlib.Path("js/battle.js"); s = p.read_text()
mark = "export const NOVA_GULP_FLAT = 0;"
assert mark in s, "battle.js 의 한 입 손잡이가 바뀌었다"
p.write_text(s.replace(mark, "export const NOVA_GULP_FLAT = %s;" % sys.argv[1], 1))
PY
}

restore;           arm base
restore; flat 16;  arm flat16
restore; flat 10;  arm flat10

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
