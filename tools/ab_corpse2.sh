#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **아깝게 만드는 두 갈래** — 첫 A/B(ab_corpse.sh)는 「들고 가는 몫을 몰수」하는 쪽이었고,
# 시체는 확실히 모자라졌지만(140 붙박이 → 17~41) **깊이가 같이 깎였다**(최고층 합 89 → 72/75).
# 몰수는 자원을 **버리는** 것이라 그렇다 — 쓰는 게 아니다.
#
# 다른 갈래: **다 쓰게 만든다.** 죽을 때 마나가 100% 로 남아 있었으니(시체도 마나도 남았다)
# 폭발의 문턱을 낮추면 남는 둘이 같이 화력으로 나간다 — 깊이를 깎지 않고도 시체가 빈다.
#
#   ㉠ base — 지금 그대로 (문턱 = 상한의 3/4 · 105 구)
#   ㉡ burn — 문턱 = 상한의 1/5 (28 구) · 그 위로는 늘 터뜨린다
#   ㉢ all  — 문턱 없음 (적이 있고 시체가 있으면 터뜨린다 · 소환 **다음** 순서는 그대로)
#
# 보는 값: 최고층 합(89 가 기준)과 시체 곡선(천장 140 에 붙어 있으면 여전히 남아도는 것).
# 씨앗 3·9·5 · 12분. 코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d)
cp js/main.js "$BK"/
restore() { cp "$BK"/main.js js/main.js; }
trap restore EXIT

arm() {                                   # arm <이름>
  for s in 3 9 5; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/c2_$1_$s.json" 2>&1 | tail -4
  done
}

swap() {                                  # swap <새 조건>
python3 - "$1" <<'PY'
import pathlib, sys
p = pathlib.Path("js/main.js"); s = p.read_text()
mark = '  if (S.mobs.length && S.corpses >= CORPSE_MAX * 0.75) cast("nova");'
assert mark in s, "auto() 의 배수구 줄이 바뀌었다"
p.write_text(s.replace(mark, '  if (' + sys.argv[1] + ') cast("nova");', 1))
PY
}

restore; arm base

restore; swap 'S.mobs.length && S.corpses >= CORPSE_MAX * 0.2'; arm burn

restore; swap 'S.mobs.length && S.corpses >= 1'; arm all

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
