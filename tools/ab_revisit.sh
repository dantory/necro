#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **되짚기** — 남은 조각 하나. 힘의 손잡이 여섯(머릿수·마중·소환수 화력·적 체력·곡선)도,
# 방울(SPAWN_GAP)도 벽을 못 밀었고, 눈금을 붙여 보니 6분의 **35%(124초)** 가 죽은 뒤
# 1층부터 되짚어 내려오는 왕복이었다(2026-08-12 11:3x).
# 지나온 **관문**(5의 배수)을 표식으로 삼아 거기서 다시 서게 하면 최고층이 오르는가.
#   base : CHECKPOINT 0 — 옛 방식, 죽으면 1층부터
#   cp   : CHECKPOINT 1 — 지나온 관문에서 다시(지금 코드의 기본값)
# ★ 씨앗 **여덟**. 코드를 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 되므로
#   씨앗 셋의 합은 잡음이다(11:0x 에 ab_dmg_wide 로 배운 것).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/core.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4 6 7"
arm() { for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/rv_$1_$s.json" 2>&1 | tail -12 || echo "FAIL $1 $s"
  done; }

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = "export const CHECKPOINT = 1;"; assert old in s, "CHECKPOINT 을 못 찾았다"
p.write_text(s.replace(old, "export const CHECKPOINT = 0;", 1))
PY
arm base

restore                    # 지금 코드가 곧 cp 팔이다
arm cp

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 팔별 최고층 — 판을 건너뛴 절대 수치는 못 믿으므로 **같은 판 안의 팔끼리만** 견준다.
python3 - <<'PY'
import json, pathlib
for arm in ("base", "cp"):
    v = []
    for s in (3, 9, 5, 1, 2, 4, 6, 7):
        f = pathlib.Path(f"tmp/rv_{arm}_{s}.json")
        try: v.append(json.loads(f.read_text())["rows"][-1]["최고층"])
        except Exception: v.append(None)
    ok = [x for x in v if x is not None]
    print(arm, v, "평균", round(sum(ok)/len(ok), 2) if ok else "?")
PY
git -C "$REPO" status --porcelain js/
