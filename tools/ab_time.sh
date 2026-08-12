#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **벽은 값이 아니라 기울기다** — 손잡이 열 개(머릿수·마중·소환수 화력 둘·적 체력·곡선·
# 방울·되짚기·귀가·구역풀기)를 댔지만 하나도 벽을 못 밀었다. 층당 시간이 깊이를 따라
# 곱절로 크기(1층 18초 → 15층 131초 = 층당 약 1.15배) 때문에 **최고층 ≈ log₁.₁₅(시간)** 이고,
# 시간을 몇 % 아끼는 손잡이는 로그 한 조각(+0.5~0.75층)밖에 못 준다.
#   t06/t12/t24 : 같은 코드로 6·12·24분 — 모형이 맞으면 두 배마다 **+5층**(log₁.₁₅2=4.96)
#   curve       : 적 체력 곡선 1.19 → **1.12** (12분) — 기울기가 원인이면 이것만 벽을 민다
# ★ 씨앗 **여덟**. 코드를 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 되므로
#   씨앗 셋의 합은 잡음이다(11:0x 에 ab_dmg_wide 로 배운 것).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/core.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4 6 7"
arm() { local nm=$1 min=$2; for s in $SEEDS; do
    echo "───────── ARM $nm · ${min}분 · SEED $s ─────────"
    LH_SEED=$s node tools/loop_health.mjs "$min" "tmp/tm_${nm}_$s.json" 2>&1 | tail -8 || echo "FAIL $nm $s"
  done; }

restore
arm t06 6
arm t12 12
arm t24 24

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = "export const floorHp   = (f) => Math.round(30 * Math.pow(1.19, f - 1));"
assert old in s, "적 체력 곡선을 못 찾았다"
new = "export const floorHp   = (f) => Math.round(30 * Math.pow(1.12, f - 1));   /* AB:curve */"
p.write_text(s.replace(old, new, 1))
PY
arm curve 12

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, math, pathlib
SE = (3, 9, 5, 1, 2, 4, 6, 7)
out = {}
for arm in ("t06", "t12", "t24", "curve"):
    v = []
    for s in SE:
        f = pathlib.Path(f"tmp/tm_{arm}_{s}.json")
        if not f.exists():
            continue
        try:
            v.append(json.loads(f.read_text())["rows"][-1]["최고층"])
        except Exception:
            pass
    if v:
        out[arm] = sum(v) / len(v)
        print(f"{arm:6s} {v} 평균 {out[arm]:.2f}")
if all(k in out for k in ("t06", "t12", "t24")):
    print(f"\n시간 두 배당 실제 +{(out['t24']-out['t06'])/2:.2f}층 "
          f"(6→12 {out['t12']-out['t06']:+.2f} · 12→24 {out['t24']-out['t12']:+.2f}) "
          f"· 모형 예측 +{math.log(2)/math.log(1.15):.2f}층")
if "curve" in out and "t12" in out:
    print(f"곡선 1.12 는 같은 12분에서 {out['curve']-out['t12']:+.2f}층 "
          f"(잡음 폭 ±0.75 보다 커야 진짜다)")
PY
