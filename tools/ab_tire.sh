#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **D-3 · 관문 주인이 지치면 조용한 구간이 사라지는가** (battle.js TIRE_AT)
#   조용한 자리는 늘 같은 한 자리였다 — 10층 관문에서 붙잡힌다(씨앗 7 268초 · 씨앗 1 188초).
#   팔 둘: 지침 없음(0, 지금 기본값) · 45초 뒤부터 10초마다 한 배씩.
#   보는 것 둘 — ① 사건 사이 **최대 간격**(끝: 180초 넘김 0판) ② **최고층**(관문이 벽이
#   되면 안 된다 · 기준선의 80% 아래로 내려가면 진 것이다).
#   ★ 한 판은 표본 하나다 — 씨앗 여덟, 중앙값으로 읽는다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="3 9 5 1 2 4 6 7"
MINS=${1:-12}
for arm in 0 45; do
  for s in $SEEDS; do
    echo "───────── 지침 $arm · SEED $s · ${MINS}분 ─────────"
    env LH_SEED=$s LH_TIRE=$arm node tools/loop_health.mjs "$MINS" "tmp/tire_${arm}_$s.json" 2>&1 | tail -4
  done
done

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - "$MINS" <<'PY'
import json, pathlib, sys
SE = (3, 9, 5, 1, 2, 4, 6, 7); END = int(sys.argv[1]) * 60
def median(xs):
    xs = sorted(xs); n = len(xs)
    if not n: return None
    m = n // 2
    return xs[m] if n % 2 else (xs[m-1] + xs[m]) / 2
def mmss(s): return f"{int(s//60)}:{int(round(s%60)):02d}"
out = {}
for arm in ("0", "45"):
    rows = []
    for s in SE:
        try: d = json.loads(pathlib.Path(f"tmp/tire_{arm}_{s}.json").read_text())
        except Exception: rows.append((s, None)); continue
        L = (d.get("사건") or {}).get("목록") or []
        gaps, prev = [], 0.0
        for e in L: gaps.append((prev, e["t"], e["t"] - prev)); prev = e["t"]
        gaps.append((prev, END, END - prev))
        mx = max(gaps, key=lambda g: g[2])
        rows.append((s, {"max": mx, "over": sum(1 for g in gaps if g[2] >= 180),
                         "top": d["rows"][-1]["최고층"] if d.get("rows") else 0}))
    out[arm] = rows
    print(f"\n── 지침 {arm} ──")
    print(f"{'seed':>4} │ {'최고층':>5} │ {'최대간격':>8} │ {'구간':>13} │ 3분넘김")
    for s, r in rows:
        if not r: print(f"{s:>4} │ (판 없음)"); continue
        print(f"{s:>4} │ {r['top']:>5} │ {r['max'][2]:>7.0f}초 │ {mmss(r['max'][0])}→{mmss(r['max'][1]):>6} │ {r['over']:>6}")
    mxs = [r["max"][2] for _, r in rows if r]; tops = [r["top"] for _, r in rows if r]
    ov = sum(r["over"] > 0 for _, r in rows if r)
    print(f"→ 최대 간격 중앙 **{median(mxs):.0f}초** · 3분 넘긴 판 **{ov}/{len(mxs)}** · 최고층 합 {sum(tops)} (중앙 {median(tops):.0f})")
base = [r["top"] for _, r in out["0"] if r]; arm = [r["top"] for _, r in out["45"] if r]
if base and arm:
    print(f"\n판정: 최고층 합 {sum(arm)} / {sum(base)} = {100*sum(arm)/max(1,sum(base)):.0f}%"
          + ("  ★ 조건② 깨짐(80% 아래) — 관문이 벽이 됐다" if sum(arm) < 0.8*sum(base) else "  · 조건② 지킴"))
    ov0 = sum(r["over"] > 0 for _, r in out["0"] if r); ov1 = sum(r["over"] > 0 for _, r in out["45"] if r)
    print("       3분 넘긴 판 " + f"{ov0} → {ov1} " + ("**끝 조건 충족**" if ov1 == 0 else "— 아직 남았다(조용한 자리는 주인이 아니라 다른 것이다)"))
PY
