#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **어느 쪽 기울기를 만지나.** 13:37 의 ab_time 으로 두 가지가 섰다 —
#   ① 최고층 ≈ log₁.₁₅(굴린 시간) 이 맞다(두 배마다 실측 +4.88 · 예측 +4.96)
#   ② 적 체력 곡선 1.19 → 1.12 만이 벽을 밀었다(12분 16.00 → **21.00**, 잡음의 여섯 배)
# 그러면 남은 물음은 「적을 덜 자라게 할까, 내 힘을 층에 붙일까」다. 몫이 같으니
# (1.19/1.12 = 1.0625) 셈으로는 맞먹어야 한다 — 정말 그런지 씨앗 여덟으로 댄다.
#   base   : 손대지 않은 지금 코드 (12분 = 16.00 이 나와야 자가 멀쩡한 것)
#   curve  : floorHp 1.19 → 1.12            (13:37 회차에서 21.00)
#   power  : dmgMulOf 에 깊이 배수 1.0625^(f-1) — 적은 그대로 세고 내가 같이 자란다
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
    LH_SEED=$s node tools/loop_health.mjs "$min" "tmp/pw_${nm}_$s.json" 2>&1 | tail -6 || echo "FAIL $nm $s"
  done; }

restore
arm base 12

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = "export const floorHp   = (f) => Math.round(30 * Math.pow(1.19, f - 1));"
assert old in s, "적 체력 곡선을 못 찾았다"
p.write_text(s.replace(old, "export const floorHp   = (f) => Math.round(30 * Math.pow(1.12, f - 1));   /* AB:curve */", 1))
PY
arm curve 12

restore
python3 - <<'PY'
import pathlib, re
p = pathlib.Path("js/core.js"); s = p.read_text()
m = re.search(r"^export const dmgMulOf = \(\) => ", s, re.M)
assert m, "dmgMulOf 를 못 찾았다"
# 본인과 소환수 **둘 다에게 걸리는 바탕**이라 여기 한 곳만 만지면 내 힘 전체가 층을 따라 큰다.
s = s[:m.start()] + "/* AB:power */ const _depthMul = () => Math.pow(1.0625, Math.max(0, (S.floor | 0) - 1));\n" + s[m.start():]
s = s.replace("export const selfDmgMul   = () => dmgMulOf() * selfMulOf();",
              "export const selfDmgMul   = () => dmgMulOf() * selfMulOf();", 1)
s = re.sub(r"^export const dmgMulOf = \(\) => ", "export const dmgMulOf = () => _depthMul() * ", s, count=1, flags=re.M)
p.write_text(s)
PY
node -e "import('./js/core.js').catch(e=>{console.error('PATCH BROKE:',e.message);process.exit(1)})" 2>/dev/null
arm power 12

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4, 6, 7)
out = {}
for arm in ("base", "curve", "power"):
    v = []
    for s in SE:
        f = pathlib.Path(f"tmp/pw_{arm}_{s}.json")
        if not f.exists():
            continue
        try:
            v.append(json.loads(f.read_text())["rows"][-1]["최고층"])
        except Exception:
            pass
    if v:
        out[arm] = sum(v) / len(v)
        print(f"{arm:6s} {v} 평균 {out[arm]:.2f}")
b = out.get("base")
if b:
    for k in ("curve", "power"):
        if k in out:
            print(f"{k:6s} {out[k]-b:+.2f}층 (잡음 폭 ±0.75 보다 커야 진짜다)")
PY
