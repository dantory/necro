#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **건너뛰기가 정말 시간을 돌려주는가** (병수님 2026-08-16 09:29 「스테이지 스킵」).
# 08-16 10:04 에 넣은 것은 「도는가」까지다 — 죽은 판이 12분 중 236초·118초(최대 33%)를
# 되짚기에 쓰던 그 시간이 실제로 잘려 나가는지는 아직 아무도 안 쟀다.
#   base : 지금 그대로 — 자동 진행은 고르는 창을 안 열어 늘 1층부터 되짚는다
#   skip : `__AUTO_DIVE` — **늘 제일 깊이 고르는 사람**을 흉내 낸다(diveAt() = diveMax()).
#          15층을 지나 본 뒤부터 열리고, 최고 깊이보다 10층 위까지만 고를 수 있다.
# > 끝: 스킵 팔의 되짚기 비중이 33% → 15% 아래 · 최고층 차이 ±1층 안
# ★ 씨앗 여섯. 코드를 안 건드리고 문(globalThis)만 여닫으므로 **난수 소비가 같아**
#   같은 씨앗이면 같은 판이다 — 팔끼리 곧바로 견줄 수 있다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="3 9 5 1 2 4"
arm() { # $1=이름  $2=LH_DIVE(빈 값이면 안 켬)
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s ─────────"
    if [ -n "$2" ]; then
      LH_SEED=$s LH_DIVE=$2 node tools/loop_health.mjs 12 "tmp/sk_$1_$s.json" 2>&1 | tail -12 || echo "FAIL $1 $s"
    else
      LH_SEED=$s node tools/loop_health.mjs 12 "tmp/sk_$1_$s.json" 2>&1 | tail -12 || echo "FAIL $1 $s"
    fi
  done
}

arm base ""
arm skip 1

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SEEDS = (3, 9, 5, 1, 2, 4)
BUCKETS = ("기다림", "싸움", "뒷정리", "되짚기")
print(f"{'팔':6} {'씨앗':>4} {'최고층':>6} {'되짚기초':>8} {'되짚기%':>7} {'죽음':>4}")
agg = {}
for arm in ("base", "skip"):
    rows = []
    for s in SEEDS:
        f = pathlib.Path(f"tmp/sk_{arm}_{s}.json")
        try:
            d = json.loads(f.read_text())
            T = d["시간"]
            tot = sum(T.get(k, 0) for k in BUCKETS) or 1
            rv = T.get("되짚기", 0)
            top = d["rows"][-1]["최고층"]
            dead = d.get("deaths", 0)
            rows.append((top, rv, 100 * rv / tot, dead))
            print(f"{arm:6} {s:>4} {top:>6} {rv:>8.1f} {100*rv/tot:>6.1f}% {dead:>4}")
        except Exception as e:
            print(f"{arm:6} {s:>4}   ?  ({e.__class__.__name__})")
    if rows:
        n = len(rows)
        agg[arm] = (sum(r[0] for r in rows)/n, sum(r[2] for r in rows)/n, sum(r[3] for r in rows)/n)
print()
for arm, (top, pct, dead) in agg.items():
    print(f"{arm:6} 평균 최고층 {top:6.2f} · 되짚기 {pct:5.1f}% · 죽음 {dead:4.2f}")
if len(agg) == 2:
    b, k = agg["base"], agg["skip"]
    ok_rv = k[1] < 15.0
    ok_top = abs(k[0] - b[0]) <= 1.0
    print(f"\n판정: 되짚기 {b[1]:.1f}% → {k[1]:.1f}% ({'통과' if ok_rv else '실패'} · 15% 아래)"
          f" · 최고층 차 {k[0]-b[0]:+.2f}층 ({'통과' if ok_top else '실패'} · ±1층)")
    print("→ 넣는다" if (ok_rv and ok_top) else "→ 아직 못 넣는다 — 위 표를 보고 다시 정한다")
PY
git -C "$REPO" status --porcelain js/
