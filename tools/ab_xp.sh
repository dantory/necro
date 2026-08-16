#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **레벨이 안 꺾인다** (병수님 2026-08-15: "레벨이 너무 빨리오르는느낌인데, 초반이라 그런가")
#   초반 탓이 아니다 — 12분 내내 분당 3레벨로 기울기가 한 번도 안 눕는다.
#   요구는 17·lv^1.42(다항)인데 벌이는 층²(시간에 거의 직선)이라 영영 안 따라잡는다.
#   팔 넷: 지금(17/1.42) · 지수만 올림(17/1.7) · 밑을 올리고 지수 중간(24/1.55) · 센 것(17/1.9)
#   ★ 잣대는 둘이다 — ①분당 레벨이 **눕는가**(뒤 4분이 앞 4분보다 느려야 한다)
#                      ②최고층이 base(49·58·53 = 합 160 · 2026-08-17)의 **80% 아래로 안 떨어질 것**
#   레벨은 스킬 점수·군세 상한·체력을 다 쥐고 있어서, 늦추면 깊이가 같이 죽는다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MINS=${1:-10}
SEEDS=${2:-1,3,9}

node tools/chrome_guard.mjs 2>&1 | tail -3

run () {                                   # run <이름> <밑> <지수>
  local tag=$1 k=$2 p=$3
  for s in ${SEEDS//,/ }; do
    echo "───── $tag (K=$k P=$p) · 씨앗 $s · ${MINS}분 ─────"
    env LH_SEED=$s LH_XPK=$k LH_XPP=$p \
      node tools/loop_health.mjs "$MINS" "tmp/abxp_${tag}_${s}.json" > "tmp/abxp_${tag}_${s}.log" 2>&1
    tail -2 "tmp/abxp_${tag}_${s}.log"
  done
}
# ★ 팔을 넷에서 셋으로 줄였다 — 넷 × 씨앗 셋 × 12분이면 **144분**이라, 답이 오늘 안에
#   안 온다. 24/1.55 는 초반만 늦추고 뒤는 그대로라 「눕는가」에 답을 못 해 뺐다.
run base 17 1.42
run p17  17 1.7
run p19  17 1.9

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - "$SEEDS" <<'PY'
import json, sys, pathlib
seeds = [s for s in sys.argv[1].split(",") if s]
ARMS = [("base","17/1.42 (지금)"), ("p17","17/1.7"), ("p19","17/1.9")]
print(f"\n{'팔':>6} │ {'12분 Lv':>8} │ {'앞4분 Lv/분':>10} │ {'뒤4분 Lv/분':>10} │ {'눕는가':>6} │ {'최고층 합':>8} │ {'base 대비':>8}")
base_top = None
for tag, name in ARMS:
    lv_end, early, late, tops = [], [], [], []
    for s in seeds:
        p = pathlib.Path(f"tmp/abxp_{tag}_{s}.json")
        if not p.exists(): continue
        r = json.loads(p.read_text())["rows"]
        if len(r) < 8: continue
        lv = [x["레벨"] for x in r]
        lv_end.append(lv[-1]); tops.append(max(x["층"] for x in r))
        early.append((lv[3] - lv[0]) / 3)          # 1→4분
        late.append((lv[-1] - lv[-4]) / 3)         # 끝 4분
    if not lv_end: print(f"{name:>6} │ (판 없음)"); continue
    e, l = sum(early)/len(early), sum(late)/len(late)
    top = sum(tops)
    if base_top is None: base_top = top
    print(f"{name:>6} │ {sum(lv_end)/len(lv_end):>8.1f} │ {e:>10.2f} │ {l:>10.2f} │ "
          f"{'예' if l < e * 0.8 else '아니오':>6} │ {top:>8} │ {top/base_top*100:>7.0f}%")
print("\n고르는 법: **눕는가=예** 인 팔 중에서 최고층이 base 의 80% 이상인 것.")
print("둘 다 못 지키면 값이 아니라 축이 틀린 것이다 — 레벨이 쥔 것(스킬점수·군세상한·체력)을 갈라야 한다.")
PY
