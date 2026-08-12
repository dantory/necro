#!/bin/bash
# **환전** — 남은 마지막 갈래. 앞의 둘은 이렇게 끝났다:
#   ㉠ 몰수(ab_corpse.sh)  — 시체는 모자라졌지만 **깊이가 19% 깎였다**(89 → 72/75).
#                            자원을 쓰는 게 아니라 버리는 것이라 그렇다.
#   ㉡ 배수구(ab_corpse2.sh) — 문턱을 낮춰 자주 터뜨려도 **시체는 140 붙박이**였다.
#                            한 입이 한 구라 재사용 2.2초 = 분당 27 구가 천장인데,
#                            깊은 층 유입이 그걸 넘는다(문턱 1/5 → 86 · 없음 → 79).
#
# 남은 답: **버리지도 흘리지도 말고 한 입을 크게.** 쌓인 몫의 1/DIV 를 한 번에 먹고
# 그만큼 세게 터진다(js/battle.js NOVA_GULP_DIV · 구당 피해 +60%, 범위 +4% 상한 1.5배).
# 유입이 클수록 배수도 커지므로 **스스로 균형이 잡히는지**가 이 자의 물음이다.
#
#   ㉠ base  — 지금 그대로 (DIV 0 · 문턱 3/4)      … 기준 89 가 다시 나오는지 보는 닻
#   ㉡ gulp8 — DIV 8  · 문턱 1/5                   … 짝이 되는 대조는 burn 의 86
#   ㉢ gulp4 — DIV 4  · 문턱 1/5                   … 더 크게 문 쪽
#
# 보는 값: **최고층 합**(base 89 · burn 86 이 기준)과 **시체 곡선**. 140 에 붙어 있으면
# 여전히 남아도는 것이고, 오르내리면 환전이 먹은 것이다.
# 씨앗 3·9·5 · 12분. 코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d)
cp js/main.js js/battle.js "$BK"/
restore() { cp "$BK"/main.js js/main.js; cp "$BK"/battle.js js/battle.js; }
trap restore EXIT

arm() {                                   # arm <이름>
  for s in 3 9 5; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/c3_$1_$s.json" 2>&1 | tail -4
  done
}

gulp() {                                  # gulp <DIV>
python3 - "$1" <<'PY'
import pathlib, sys
p = pathlib.Path("js/battle.js"); s = p.read_text()
mark = "export const NOVA_GULP_DIV = 0;"
assert mark in s, "battle.js 의 환전 손잡이가 바뀌었다"
p.write_text(s.replace(mark, "export const NOVA_GULP_DIV = %s;" % sys.argv[1], 1))
PY
}

thresh() {                                # thresh <새 조건>
python3 - "$1" <<'PY'
import pathlib, sys
p = pathlib.Path("js/main.js"); s = p.read_text()
mark = '  if (S.mobs.length && S.corpses >= CORPSE_MAX * 0.75) cast("nova");'
assert mark in s, "auto() 의 배수구 줄이 바뀌었다"
p.write_text(s.replace(mark, '  if (' + sys.argv[1] + ') cast("nova");', 1))
PY
}

restore; arm base

restore; gulp 8; thresh 'S.mobs.length && S.corpses >= CORPSE_MAX * 0.2'; arm gulp8

restore; gulp 4; thresh 'S.mobs.length && S.corpses >= CORPSE_MAX * 0.2'; arm gulp4

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
