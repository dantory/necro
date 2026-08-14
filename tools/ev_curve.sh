#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **D-1 · 화면에서 사건이 얼마나 자주 나는가** — 30분 곡선에서 사건 사이 최대 간격을 잰다.
#   사건: 레벨업 · 유니크 · 관문 · 위기(체력 절반 아래·군세 반토막) · 환생(검수기는 0)
#   끝: **사건 사이 최대 간격이 3분(180초) 아래.** 넘는 구간이 곧 다음 작업이다.
# ★ 한 판은 표본 하나다 — 씨앗 여덟을 돌리고 **중앙값**으로 읽는다(낱 판의 최대 간격은
#   운으로 크게 흔들린다). 팔이 하나뿐이라 A/B 가 아니라 **현재 상태의 사진**이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="3 9 5 1 2 4 6 7"
MINS=${1:-30}
for s in $SEEDS; do
  echo "───────── SEED $s · ${MINS}분 ─────────"
  env LH_SEED=$s node tools/loop_health.mjs "$MINS" "tmp/ev_$s.json" 2>&1 | tail -8
  [ "${PIPESTATUS[0]}" = 0 ] || echo "★ FAIL seed $s (rc=${PIPESTATUS[0]})"
done

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - "$MINS" <<'PY'
import json, pathlib, sys
SE = (3, 9, 5, 1, 2, 4, 6, 7)
END = int(sys.argv[1]) * 60
KINDS = ("레벨업", "유니크", "관문", "위기", "환생")

def median(xs):
    xs = sorted(xs); n = len(xs)
    if not n: return None
    m = n // 2
    return xs[m] if n % 2 else (xs[m - 1] + xs[m]) / 2

def mmss(s): return f"{int(s//60)}:{int(round(s%60)):02d}"

rows, worst = [], []
for s in SE:
    try:
        d = json.loads(pathlib.Path(f"tmp/ev_{s}.json").read_text())
    except Exception:
        rows.append((s, None)); continue
    E = d.get("사건") or {}
    L = E.get("목록") or []
    # 간격 — 0초부터 재고 마지막 사건 뒤 꼬리까지 넣는다(자가 조용한 끝을 숨기면 안 된다).
    gaps, prev = [], 0.0
    for e in L:
        gaps.append((prev, e["t"], e["t"] - prev)); prev = e["t"]
    gaps.append((prev, END, END - prev))
    mx = max(gaps, key=lambda g: g[2])
    over = [g for g in gaps if g[2] >= 180]
    rows.append((s, {"n": len(L), "수": E.get("수") or {}, "max": mx, "over": len(over),
                     "top": d["rows"][-1]["최고층"] if d.get("rows") else None}))
    worst += [(g[2], s, g) for g in over]

print(f"{'seed':>4} │ {'최고층':>5} │ {'사건':>4} │ {'최대간격':>8} │ {'구간':>13} │ 3분넘김 │ 레벨/유니크/관문/위기")
print("─" * 96)
mxs, ns = [], []
for s, r in rows:
    if not r:
        print(f"{s:>4} │ (판 없음)"); continue
    c = r["수"]
    mxs.append(r["max"][2]); ns.append(r["n"])
    print(f"{s:>4} │ {r['top']:>5} │ {r['n']:>4} │ {r['max'][2]:>7.0f}초 │"
          f" {mmss(r['max'][0])}→{mmss(r['max'][1]):>6} │ {r['over']:>6} │"
          f" {c.get('레벨업',0)}/{c.get('유니크',0)}/{c.get('관문',0)}/{c.get('위기',0)}")
print("─" * 96)
if mxs:
    med = median(mxs)
    print(f"최대 간격 **중앙 {med:.0f}초** (최소 {min(mxs):.0f} · 최대 {max(mxs):.0f})"
          f" · 사건 수 중앙 {median(ns):.0f}번 ({END/max(1,median(ns)):.0f}초에 한 번)")
    print("판정: " + ("**끝 조건 충족** — 중앙 최대 간격이 180초 아래다"
                     if med < 180 else
                     f"**못 넘김** — 중앙 최대 간격 {med:.0f}초. 아래 조용한 구간이 다음 작업이다"))
    if worst:
        worst.sort(reverse=True)
        print("\n제일 조용했던 구간 (씨앗 · 언제 · 몇 초):")
        for L_, s, g in worst[:8]:
            print(f"  씨앗 {s} · {mmss(g[0])} → {mmss(g[1])} = {L_:.0f}초")
PY
