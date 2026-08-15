#!/bin/bash
. "$(dirname "$0")/ab_guard.sh"
# **겹치기를 아예 안 허용해서 적이 못 다가온다** (병수님 2026-08-15 17:08)
#   닿을 거리가 (a.r+b.r) × TOUCH_K 인데 K=1 이면 몸이 어깨를 맞대고 선다 —
#   앞줄이 자리를 다 먹으면 뒷줄은 영영 못 붙는다. K 를 내려 겹침을 허용해 본다.
#   잣대 셋: ①적이 실제로 때린 횟수(맞은횟수) ②최고층 ③겹침(pack_probe 는 따로)
set -u
REPO=/Users/lbs/source/personal/necro; cd "$REPO" || exit 1
MINS=${1:-12}; SEEDS=${2:-1,3,9}
node tools/chrome_guard.mjs 2>&1 | tail -2
for k in 1 0.8 0.65; do
  for s in ${SEEDS//,/ }; do
    echo "───── K=$k · 씨앗 $s · ${MINS}분 ─────"
    env LH_SEED=$s LH_TOUCH=$k node tools/loop_health.mjs "$MINS" "tmp/abtouch_${k}_${s}.json" > "tmp/abtouch_${k}_${s}.log" 2>&1
    tail -1 "tmp/abtouch_${k}_${s}.log"
  done
done
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - "$SEEDS" <<'PY'
import json, sys, pathlib
seeds=[s for s in sys.argv[1].split(",") if s]
print(f"\n{'겹침허용':>7} │ {'맞은횟수':>8} │ {'절반아래초':>9} │ {'죽음':>4} │ {'최고층 합':>8} │ {'base대비':>7}")
base=None
for k in ("1","0.8","0.65"):
    hits=deaths=half=0; tops=[]
    for s in seeds:
        p=pathlib.Path(f"tmp/abtouch_{k}_{s}.json")
        if not p.exists(): continue
        d=json.loads(p.read_text()); r=d["rows"]
        tops.append(max(x["층"] for x in r)); deaths+=len(d.get("deaths",[]))
        w=d.get("시간",{}).get("위험",{})
        half+=w.get("절반아래",0)
        for band in (w.get("띠") or {}).values(): hits+=band.get("맞은횟수",0)
    if not tops: print(f"{k:>7} │ (판 없음)"); continue
    top=sum(tops)
    if base is None: base=top
    print(f"{k:>7} │ {hits:>8} │ {half:>9.0f} │ {deaths:>4} │ {top:>8} │ {top/base*100:>6.0f}%")
print("\n고르는 법: 맞은횟수가 늘고(적이 닿는다) 최고층이 base 의 80% 이상.")
PY
