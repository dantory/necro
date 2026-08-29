#!/bin/bash
# V-140 — **사람이 고르는 축은 얼마나 무거운가.**
#   V-139b 가 강화 넷(생명력·기력·어둠의 힘·군세)을 사람 손으로 옮겼다. 그런데 그 넷이
#   판을 얼마나 바꾸는지는 **한 번도 안 쟀다** — 자는 늘 사 왔기 때문이다(`autoForgeOn`
#   이 `__AUTO_TREE` 를 따라온다). 안 사는 팔을 만들어 «무게»를 잰다.
#   ★ 물음: 강화 넷을 한 급도 안 사도 최고층이 그대로면, 병수님이 말한
#     「투자를 해서 그 벽을 넘어선다」가 설 자리가 산수에 없다는 뜻이다(V-138).
. "$(dirname "$0")/ab_guard.sh"
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
node tools/chrome_guard.mjs || true
SEEDS="3 9 5"
run() { local nm=$1; shift
  for s in $SEEDS; do
    echo "──── $nm · SEED $s · $(date +%H:%M) ────"
    env LH_SEED=$s "$@" node tools/loop_health.mjs 12 "tmp/v140_${nm}_$s.json" 2>&1 | tail -5 || echo "FAIL $nm $s"
  done
}
run on                      # 여태 그대로 — 자가 강화 넷을 산다
run off  LH_AUTOFORGE=0     # 사람이 한 급도 안 산 판(재련만 저절로 탄다)
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY2'
import json, pathlib
SE=(3,9,5)
for nm in ("on","off"):
    fl=[];lv=[];gd=[];sc=[];dd=[]
    for s in SE:
        f=pathlib.Path(f"tmp/v140_{nm}_{s}.json")
        if not f.exists(): continue
        d=json.loads(f.read_text()); r=d["rows"][-1]
        fl.append(r["최고층"]); lv.append(r["레벨"]); gd.append(r["금"])
        sc.append(r["낀것점수"]); dd.append(len(d.get("deaths",[])))
    if not fl: print(f"{nm:>4}  (자료 없음)"); continue
    m=lambda a: sum(a)/len(a)
    print(f"{nm:>4}  최고층 {fl} 합 {sum(fl):3d} · 끝Lv {m(lv):5.1f} · 남은금 {m(gd):9,.0f} "
          f"· 낀것 {m(sc):6.0f} · 죽음 {m(dd):4.1f}")
print()
print("읽는 법: off 의 **최고층 합이 on 의 90% 를 넘으면** 강화 넷은 «무게가 없는 축»이다 —")
print("         그러면 고칠 것은 「사람이 고르게 하기」가 아니라 「고른 것이 듣게 하기」다.")
PY2
git -C "$REPO" status --porcelain js/ tools/
