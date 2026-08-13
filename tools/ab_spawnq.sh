#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-c **적이 나오는 줄이 층당 시간을 정하고 있었다.**
#   SPAWN_GAP 주석은 「마릿수가 많은 층에서 상한도 둔다」고 적혀 있었지만 **상한이 코드에
#   없었다.** 간격은 늘 0.55~0.95 초 — 마릿수는 층마다 는다(floorN = 5 + 0.7f).
#   90층이면 68 마리 × 0.75 = **51 초**, 그 층의 층당 55초의 거의 전부다.
#   화력을 아무리 키워도 이 줄보다 빨리 층을 비울 수 없다.
#     base : SPAWN_FULL=0 — 지금까지의 코드(장치 꺼짐)
#     rush : SPAWN_FULL=6 — **판이 빈 만큼** 빨리 낸다(찼으면 예전 간격 그대로)
#   보는 것은 「기다림」(줄은 남았는데 판이 텅 빈 시간)이 **최고층을 깎지 않고** 주는지다.
#   빨리 내면 판에 적이 더 오래 서 있으니 죽음이 늘 수 있다 — 최고층/죽음을 같이 본다.
# ★ 씨앗 **여섯**. 코드를 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 되므로
#   한두 판의 차이는 잡음이다(11:0x 에 ab_dmg_wide 로 배운 것).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/battle.js "$BK"/
restore() { cp "$BK"/battle.js js/battle.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4"
arm() { for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/sq_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done; }

# ── base: 장치를 끈다(SPAWN_FULL=0 이면 배수가 늘 1 — 예전 간격 그대로) ──
restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/battle.js"); s = p.read_text()
old = "const SPAWN_FULL = 6;"
assert old in s, "SPAWN_FULL 을 못 찾았다"
p.write_text(s.replace(old, "const SPAWN_FULL = 0;   /* AB:base — 장치 꺼짐 */", 1))
PY
arm base

# ── rush: 리포에 든 그대로(SPAWN_FULL=6) ──
restore
arm rush

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/sq_{arm}_{s}.json").read_text())
    except Exception:
        return None
print(f"{'씨앗':>4} {'최고층 base→rush':>18} {'기다림초 base→rush':>20} {'죽음 base→rush':>16}")
agg = {}
for arm in ("base", "rush"):
    agg[arm] = {"f": [], "w": [], "d": []}
for s in SE:
    line = [f"{s:>4}"]
    cell = {}
    for arm in ("base", "rush"):
        d = load(arm, s)
        if not d:
            cell[arm] = (None, None, None); continue
        f = d["rows"][-1]["최고층"]
        w = (d.get("시간") or {}).get("기다림")
        dead = len(d.get("deaths") or []) if isinstance(d.get("deaths"), list) else d.get("deaths")
        cell[arm] = (f, w, dead)
        agg[arm]["f"].append(f)
        if w is not None: agg[arm]["w"].append(w)
        if isinstance(dead, (int, float)): agg[arm]["d"].append(dead)
    b, r = cell["base"], cell["rush"]
    print(f"{s:>4} {str(b[0])+'→'+str(r[0]):>18} "
          f"{(f'{b[1]:.0f}→{r[1]:.0f}' if b[1] is not None and r[1] is not None else '?'):>20} "
          f"{str(b[2])+'→'+str(r[2]):>16}")
def avg(v): return round(sum(v)/len(v), 2) if v else "?"
for arm in ("base", "rush"):
    a = agg[arm]
    print(f"{arm:>5}  최고층평균 {avg(a['f'])} · 기다림평균 {avg(a['w'])}초 · 죽음평균 {avg(a['d'])}")
print()
print("판정 기준: 기다림이 확 줄고 최고층이 안 깎였으면 통과. 최고층이 깎였으면")
print("           SPAWN_RUSH 를 올리거나(0.15→0.3) SPAWN_FULL 을 낮춰(6→3) 다시 잰다.")
PY
git -C "$REPO" status --porcelain js/
