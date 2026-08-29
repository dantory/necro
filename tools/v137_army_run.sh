#!/bin/bash
# V-137 — 「군세가 상한의 60% 에서 멎는다 · 제일 큰 통은 재사용 55%」를 고칠 팔을 고른다.
#   army_why(6씨앗) 판정: 군세 5.6 / 상한 9.4 · 시체 37구가 쌓여 있는데 «재사용» 이 55%.
#   ★ 팔 셋은 **이미 코드에 서 있는데 기본값이 전부 꺼짐**이다(BATCH 1 · SPILL 0 · HASTE 0).
#     재 놓고 안 켠 손잡이다. 이번엔 켠 값끼리 겨룬다.
. "$(dirname "$0")/ab_guard.sh"
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
node tools/chrome_guard.mjs || true
SEEDS="3 9 5"
run() { # 이름 · 환경
  local nm=$1; shift
  for s in $SEEDS; do
    echo "──── $nm · SEED $s · $(date +%H:%M) ────"
    env LH_SEED=$s "$@" node tools/loop_health.mjs 12 "tmp/v137_${nm}_$s.json" 2>&1 | tail -6 || echo "FAIL $nm $s"
  done
}
run base
run batch  LH_RAISEBATCH=3
run spill  LH_SPILL=1
run both   LH_RAISEBATCH=3 LH_SPILL=1
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY2'
import json, pathlib
SE=(3,9,5)
for nm in ("base","batch","spill","both"):
    hs=[];caps=[];fl=[];bins={}
    for s in SE:
        f=pathlib.Path(f"tmp/v137_{nm}_{s}.json")
        if not f.exists(): continue
        d=json.loads(f.read_text()); A=d["시간"].get("군세")
        if not A or not A.get("초"): continue
        n=A["초"]/0.05
        hs.append(A["머릿수합"]/n); caps.append(A["상한합"]/n)
        fl.append(d["rows"][-1]["최고층"])
        for k,v in A["막힘"].items(): bins[k]=bins.get(k,0)+100*v/A["초"]/len(SE)
    if not hs: print(f"{nm:>6}  (자료 없음)"); continue
    top=sorted(bins.items(),key=lambda x:-x[1])[:3]
    print(f"{nm:>6}  군세 {sum(hs)/len(hs):4.1f} / 상한 {sum(caps)/len(caps):4.1f} "
          f"({100*sum(hs)/sum(caps):3.0f}% 참) · 최고층 {sum(fl)/len(fl):5.1f} │ "
          + " · ".join(f"{k} {v:.0f}%" for k,v in top))
print()
print("고르는 자: **군세가 상한에 얼마나 차는가** — 최고층은 안 떨어지는지만 본다(떨어지면 그 팔은 버린다).")
PY2
git -C "$REPO" status --porcelain js/
