#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **화력을 재는 A/B** — 벽은 관문이고, 셈이 이미 답을 말한다:
#   15층 보스 체력 2401 · 군대 초당 68 → 잡는 데 35초.
#   보스는 3.2초에 한 기씩 눕혀 19초면 군대가 지워진다. 35초가 필요한데 19초를 버틴다.
# 그래서 **머릿수(㉮)도 마중(㉯)도 아니라 화력**을 잰다.
#
#   ㉠ base — 손대지 않은 지금 (대조군. 옛 숫자를 믿지 않고 같은 날 같은 브라우저로 다시 잰다)
#   ㉡ amp  — auto() 가 「약화의 저주」를 건다 (피해 ×1.4. 죽을 때 마나가 82% 남아 있었다 = 노는 자원)
#   ㉢ dmg  — RAISE_DMG 0.05 → 0.09 (소환수 한 방을 키운다)
#
# 씨앗을 박지 않으면 아무것도 못 가른다(loop_health 머리말 참고) — 3·9·5 로 각각 12분.
# 코드는 **복사본으로 되돌린다**(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d)
cp js/core.js js/main.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; cp "$BK"/main.js js/main.js; }
trap restore EXIT

arm() {                                   # arm <이름>
  for s in 3 9 5; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/ab_$1_$s.json" 2>&1 | tail -14
  done
}

restore; arm base

restore
# 「약화의 저주」를 자동으로 — cast() 가 재사용/마나를 이미 막으므로 매 틱 불러도 된다.
python3 - <<'PY'
import re, pathlib
p = pathlib.Path("js/main.js"); s = p.read_text()
old = '  if (!S.minions.some(m => m.kind === "golem")) cast("golem");'
assert old in s, "auto() 모양이 바뀌었다"
s = s.replace(old, old + '\n  if (S.mobs.length) cast("amp");', 1)
p.write_text(s)
PY
arm amp

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = "export const RAISE_DMG = 0.05;"
assert old in s, "RAISE_DMG 모양이 바뀌었다"
p.write_text(s.replace(old, "export const RAISE_DMG = 0.09;", 1))
PY
arm dmg

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
