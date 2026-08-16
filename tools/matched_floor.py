#!/usr/bin/env python3
"""같은 층에서 견준다 — 「시간을 아꼈나, 살을 찌웠나」를 가르는 자.

까닭: 12분 총합(평균 금·레벨/층)은 **깊이와 엉켜 있다.** 되짚는 시간을 돌려주면
그 시간이 전진에 쓰여 더 깊이 가고, 깊은 층은 원래 값진 것을 떨군다 —
그래서 「금 +135%」가 **살이 쪘다는 뜻인지 더 갔다는 뜻인지** 총합만 봐서는 모른다.

가르는 법: **층을 x축에 놓는다.** 팔이 달라도 씨앗이 같으면 같은 판이므로,
「30층에 닿았을 때의 레벨·금」을 팔끼리 곧바로 견줄 수 있다. 겹치면 FF 는
시계만 돌린 것이고, 벌어지면 한 층에서 더 많이 잡은 것이다.

쓰기: python3 tools/matched_floor.py <접두사> <팔,팔,…> [씨앗들]
      python3 tools/matched_floor.py rff base,ff2,ff3
"""
import json
import pathlib
import sys

PREFIX = sys.argv[1] if len(sys.argv) > 1 else "rff"
ARMS = (sys.argv[2] if len(sys.argv) > 2 else "base,ff2,ff3").split(",")
SEEDS = [int(x) for x in (sys.argv[3].split(",") if len(sys.argv) > 3 else "3 9 5 1 2 4".split())]


def curve(arm, seed):
    """최고층 → (레벨, 금) 곡선. 층이 x축이고 층은 안 줄어든다."""
    f = pathlib.Path(f"tmp/{PREFIX}_{arm}_{seed}.json")
    if not f.exists():
        return None
    rows = json.loads(f.read_text())["rows"]
    pts = []
    for r in rows:
        top = r["최고층"]
        # 같은 층에 여러 표본이면 마지막 것(그 층을 떠날 때의 값)을 쓴다
        if pts and pts[-1][0] == top:
            pts[-1] = (top, r["레벨"], r["금"])
        else:
            pts.append((top, r["레벨"], r["금"]))
    return pts


def at(pts, floor):
    """그 층에 닿았을 때의 (레벨, 금) — 표본 사이는 곧은 줄로 잇는다."""
    if not pts or floor < pts[0][0] or floor > pts[-1][0]:
        return None
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        if a[0] <= floor <= b[0]:
            if b[0] == a[0]:
                return (a[1], a[2])
            t = (floor - a[0]) / (b[0] - a[0])
            return (a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]))
    return (pts[-1][1], pts[-1][2])


curves = {(arm, s): curve(arm, s) for arm in ARMS for s in SEEDS}
missing = [k for k, v in curves.items() if not v]
if missing:
    print(f"⚠ 없는 판 {len(missing)}개: {missing}")

# ★ 천장은 **씨앗마다** 따로 잡는다. 모든 판의 최솟값으로 자르면 제일 못 간 판 하나가
#   견주는 자리를 통째로 얕은 데로 끌어내린다(씨앗 9 하나 때문에 20층까지만 봤다).
#   씨앗이 같으면 같은 판이므로 견줄 짝은 **그 씨앗 안에서** 있으면 된다.
tops = [v[-1][0] for v in curves.values() if v]
if not tops:
    sys.exit("판이 하나도 없다")
SEED_CEIL = {s: min((curves[(a, s)][-1][0] for a in ARMS if curves.get((a, s))), default=0) for s in SEEDS}
CEIL = max(SEED_CEIL.values())
FLOORS = [f for f in (10, 15, 20, 25, 30, 35, 40, 45, 50) if f <= CEIL]
print(f"견주는 층: {FLOORS}  (씨앗마다 그 씨앗의 모든 팔이 닿은 데까지)")
print(f"씨앗별 천장: " + " · ".join(f"{s}:{c}층" for s, c in SEED_CEIL.items()) + "\n")

print(f"{'층':>4} | " + " | ".join(f"{a:>9}" for a in ARMS) + "   ← 그 층에 닿았을 때의 레벨")
base = ARMS[0]
for f in FLOORS:
    cells, ref = [], None
    for arm in ARMS:
        vals = [at(curves[(arm, s)], f) for s in SEEDS if curves[(arm, s)]]
        vals = [v[0] for v in vals if v]
        if not vals:
            cells.append("        ?")
            continue
        m = sum(vals) / len(vals)
        n = len(vals)
        if arm == base:
            ref = m
            cells.append(f"{m:>6.1f}({n})")
        else:
            cells.append(f"{m:>6.1f}{100*(m/ref-1):>+3.0f}%" if ref else f"{m:>9.1f}")
    print(f"{f:>4} | " + " | ".join(cells))

print(f"\n{'층':>4} | " + " | ".join(f"{a:>9}" for a in ARMS) + "   ← 그 층에 닿았을 때의 금")
for f in FLOORS:
    cells, ref = [], None
    for arm in ARMS:
        vals = [at(curves[(arm, s)], f) for s in SEEDS if curves[(arm, s)]]
        vals = [v[1] for v in vals if v]
        if not vals:
            cells.append("        ?")
            continue
        m = sum(vals) / len(vals)
        n = len(vals)
        if arm == base:
            ref = m
            cells.append(f"{m:>6.0f}({n})")
        else:
            cells.append(f"{m:>6.0f}{100*(m/ref-1):>+3.0f}%" if ref else f"{m:>9.0f}")
    print(f"{f:>4} | " + " | ".join(cells))

# 판정 — 겹친 층들의 평균 벌어짐으로 말한다
print()
for arm in ARMS[1:]:
    dl, dg = [], []
    for f in FLOORS:
        for s in SEEDS:
            a, b = curves.get((base, s)), curves.get((arm, s))
            if not a or not b:
                continue
            va, vb = at(a, f), at(b, f)
            if not va or not vb:
                continue
            if va[0]:
                dl.append(vb[0] / va[0] - 1)
            if va[1] > 0:
                dg.append(vb[1] / va[1] - 1)
    if not dl:
        continue
    L = 100 * sum(dl) / len(dl)
    G = 100 * sum(dg) / len(dg)
    verdict = "시계만 빨라졌다(살 안 찜)" if abs(L) < 5 and abs(G) < 25 else "한 층에서 더 먹는다(살 찜)"
    print(f"[{arm}] 같은 층에서 레벨 {L:+.1f}% · 금 {G:+.1f}%  → {verdict}")
