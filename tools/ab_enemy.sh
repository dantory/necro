#!/bin/bash
# **적 쪽을 재는 A/B** — 화력을 우리 쪽에서 키우는 팔은 전부 헛돌았다:
#   ㉮ 재소환 두 배 → 최고층 나빠짐 · RAISE_DMG 0.05→0.09(거의 두 배) → **아무 변화 없음**.
#   0.09 가 한 층도 못 밀었다는 것이 이상하다 — 상수 배수 1.8 이면 1.19 성장에서
#   3~4 층은 밀려야 한다. 그래서 이번엔 **적 쪽 손잡이**를 댄다(아직 한 번도 안 재 봤다).
#
#   ㉠ base  — 손대지 않은 지금 (대조군)
#   ㉡ boss  — 관문 주인 체력 ×7 → ×4.5 (죽기 직전 5초 피해 100% 가 층의 주인이었다)
#   ㉢ curve — floorHp 성장 1.19 → 1.16 (적 체력 곡선 자체가 우리 성장을 앞지르는지)
#   ㉣ dmg2  — RAISE_DMG 0.05 → 0.10 (믿을 수 있는 자로 옛 「변화 없음」을 다시 확인)
#
# 자는 이제 재현된다(ab_repeat.sh, 두 회차가 분마다 동일). 씨앗 3·9·5 로 각각 12분.
# 코드는 **복사본으로 되돌린다**(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d)
cp js/core.js js/battle.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; cp "$BK"/battle.js js/battle.js; }
trap restore EXIT

arm() {                                   # arm <이름>
  for s in 3 9 5; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/en_$1_$s.json" 2>&1 | tail -14
  done
}

restore; arm base

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/battle.js"); s = p.read_text()
old = "m.hp = m.hpMax = floorHp(q.f) * 7;"
assert old in s, "관문 주인 체력 모양이 바뀌었다"
p.write_text(s.replace(old, "m.hp = m.hpMax = floorHp(q.f) * 4.5;", 1))
PY
arm boss

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = "export const floorHp   = (f) => Math.round(30 * Math.pow(1.19, f - 1));"
assert old in s, "floorHp 모양이 바뀌었다"
p.write_text(s.replace(old, "export const floorHp   = (f) => Math.round(30 * Math.pow(1.16, f - 1));", 1))
PY
arm curve

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = "export const RAISE_DMG = 0.05;"
assert old in s, "RAISE_DMG 모양이 바뀌었다"
p.write_text(s.replace(old, "export const RAISE_DMG = 0.10;", 1))
PY
arm dmg2

restore
echo "═════ 끝 · $(date +%H:%M) · 되돌림 확인 ═════"
git -C "$REPO" status --porcelain js/
