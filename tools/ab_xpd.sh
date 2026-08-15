#!/bin/bash
. "$(dirname "$0")/ab_guard.sh"
# **레벨은 값이 아니라 축이었다** — 요구를 lv^1.9 까지 올려도 안 눕는다(ab_xp.sh 결과).
#   까닭은 벌이 쪽이다: 마리당 xp 가 **층에 정비례**(층×0.6)하고 마릿수도 5+0.7층 이라
#   층당 총 xp 가 층² 로 큰다. 깊이는 시간에 거의 직선이니 벌이는 시간²다.
#   그래서 이번엔 **깊이 민감도**를 민다 — 마리당 xp = 0.6 × 층^d.
#   팔 셋: d=1(지금) · d=0.5(√층) · d=0(깊이와 무관, 마릿수만)
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MINS=${1:-12}; SEEDS=${2:-1,3,9}
node tools/chrome_guard.mjs 2>&1 | tail -2
for d in 1 0.5 0; do
  for s in ${SEEDS//,/ }; do
    echo "───── d=$d · 씨앗 $s · ${MINS}분 ─────"
    env LH_SEED=$s LH_XPD=$d node tools/loop_health.mjs "$MINS" "tmp/abxpd_${d}_${s}.json" > "tmp/abxpd_${d}_${s}.log" 2>&1
    tail -1 "tmp/abxpd_${d}_${s}.log"
  done
done
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - "$SEEDS" <<'PY'
import json, sys, pathlib
seeds = [s for s in sys.argv[1].split(",") if s]
print(f"\n{'깊이민감도':>8} │ {'끝 Lv':>6} │ {'앞4분':>6} │ {'뒤4분':>6} │ {'눕는가':>6} │ {'최고층 합':>8} │ {'base 대비':>8}")
base = None
for d in ("1", "0.5", "0"):
    lv, e4, l4, tops = [], [], [], []
    for s in seeds:
        p = pathlib.Path(f"tmp/abxpd_{d}_{s}.json")
        if not p.exists(): continue
        r = json.loads(p.read_text())["rows"]
        if len(r) < 8: continue
        L = [x["레벨"] for x in r]
        lv.append(L[-1]); tops.append(max(x["층"] for x in r))
        e4.append((L[3]-L[0])/3); l4.append((L[-1]-L[-4])/3)
    if not lv: print(f"{d:>8} │ (판 없음)"); continue
    a, b, top = sum(e4)/len(e4), sum(l4)/len(l4), sum(tops)
    if base is None: base = top
    print(f"{d:>8} │ {sum(lv)/len(lv):>6.1f} │ {a:>6.2f} │ {b:>6.2f} │ {'예' if b < a*0.8 else '아니오':>6} │ {top:>8} │ {top/base*100:>7.0f}%")
print("\n고르는 법: 눕는가=예 · 최고층 base 의 80% 이상.")
PY
