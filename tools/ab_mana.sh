#!/bin/bash
# **마나를 누가 먼저 쓰나** — 저주를 넣어 벽이 15→18층으로 밀렸지만 **씨앗 3 은 그대로 15** 다.
# 그 씨앗의 사진이 원인을 가리킨다: 죽을 때 **마나 2%·군세 17%**, 「제일 모자란 것 = 마나」.
# auto() 는 지금 **저주를 소환보다 먼저** 부른다(golem → amp → ghoul → raise) —
# 저주가 마나를 먼저 먹고 군대가 못 선다. 값이 아니라 **차례**가 문제일 수 있다.
#
#   ㉠ base — 지금 그대로 (amp 가 소환보다 앞)
#   ㉡ late — amp 를 소환 **뒤로** 옮긴다 (남는 마나로만 저주)
#   ㉢ cap  — 군세가 **상한일 때만** 저주 (군대를 먼저 채운다)
#
# 아끼는 모양은 이미 두 번 졌다(관문에서만 15.7 · 마나 45% 위 16.7 < 그냥 18.0) —
# 이건 「아끼기」가 아니라 **순서**라서 다른 축이다. 씨앗 3·9·5 · 12분.
# 코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
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
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/mn_$1_$s.json" 2>&1 | tail -12
  done
}

restore; arm base

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/main.js"); s = p.read_text()
amp  = '  if (S.mobs.length) cast("amp");\n'
last = '  if (S.corpses >= 1 && armyN() < armyCap()) cast("raise");\n'
assert amp in s and last in s, "auto() 모양이 바뀌었다"
s = s.replace(amp, "", 1)
s = s.replace(last, last + amp, 1)
p.write_text(s)
PY
arm late

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/main.js"); s = p.read_text()
amp = '  if (S.mobs.length) cast("amp");'
assert amp in s, "auto() 모양이 바뀌었다"
p.write_text(s.replace(amp, '  if (S.mobs.length && armyN() >= armyCap()) cast("amp");', 1))
PY
arm cap

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
