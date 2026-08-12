#!/bin/bash
# **시체가 아까워지는가** — 천장(140)은 씌웠지만(b5b9be5) 재 보니 5 분에 24→131 로
# 여전히 천장까지 탄다. 분당 26 구가 들어오는데 폭발의 최대 배수량이 분당 27 구라
# 사실상 못 따라잡는다 — 「모자라서 아까운 것」이 아직 아니다.
#
# 물이 안 빠지면 **들어오는 쪽**을 봐야 한다. 층을 넘길 때 판 위 그림(S.piles)은
# 어둠에 잠겨 걷히는데 **셈만 그대로 따라온다**(enterFloor 의 예외) — 그래서 층을
# 내려갈수록 셈은 한 방향으로만 는다. 걷히는 그림을 셈도 따라가게 하면 매 층이
# **빈손에서 시작**해, 아끼고 터뜨리는 판단이 되살아난다. 다만 너무 매몰차면
# 군대가 지워진 채 내려간 판에서 첫 소환을 못 해 그대로 죽는다 — 그래서 절반을 같이 댄다.
#
#   ㉠ base — 지금 그대로 (천장 140 · 층을 넘겨도 셈은 그대로)
#   ㉡ half — 층을 넘길 때 **절반만** 들고 간다
#   ㉢ zero — 층을 넘기면 **그림과 함께 셈도 걷힌다** (셈 = 그 층에서 잡은 것)
#
# 보는 값: 최고층(늘 보던 자)과 **시체 곡선**(천장에 붙어 있으면 여전히 남아도는 것).
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
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/cp_$1_$s.json" 2>&1 | tail -8
  done
}

# ★ 손대는 자리는 enterFloor 안이 아니라 **내려가는 자리**다 — enterFloor 는 판을 열 때도
#   불리고(newRun), 거기서 셈을 깎으면 그냥 준 첫 시체 셋이 사라져 첫 소환을 못 한다.
patch() {                                 # patch <넣을 줄>
python3 - "$1" <<'PY'
import pathlib, sys
p = pathlib.Path("js/battle.js"); s = p.read_text()
mark = '    enterFloor(S.floor + 1);'
assert mark in s, "내려가는 자리의 모양이 바뀌었다"
p.write_text(s.replace(mark, sys.argv[1] + '\n' + mark, 1))
PY
}

restore; arm base

restore; patch '    S.corpses = S.corpses >> 1;   /* A/B half */'; arm half

restore; patch '    S.corpses = 0;                /* A/B zero */'; arm zero

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
