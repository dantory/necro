#!/bin/bash
# **씨앗을 넓혀서 다시** — ab_enemy.sh 에서 dmg2(RAISE_DMG 0.05→0.10) 가 씨앗 셋 합에서
# 49→54 로 앞섰다. 그런데 팔마다 **씨앗별 숫자가 제멋대로 오간다**(base 씨9=18 인데
# 다른 팔은 15, base 씨3=15 인데 다른 팔은 19). 코드를 바꾸면 난수 소비가 달라져
# **같은 씨앗이라도 아예 다른 판**이 되기 때문이다 — 그러니 씨앗 셋의 합은 아직 잡음이다.
# 두 팔만 남기고 **씨앗 여덟**으로 다시 댄다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/core.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4 6 7"
arm() { for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/wd_$1_$s.json" >/dev/null 2>&1 || echo "FAIL $1 $s"
  done; }
restore; arm base
restore
python3 - <<'PY'
import pathlib
p=pathlib.Path("js/core.js"); s=p.read_text()
old="export const RAISE_DMG = 0.05;"; assert old in s
p.write_text(s.replace(old,"export const RAISE_DMG = 0.10;",1))
PY
arm dmg2
restore
echo "═════ 끝 · $(date +%H:%M) ═════"; git -C "$REPO" status --porcelain js/
