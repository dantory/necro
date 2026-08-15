#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **레벨은 값이 아니라 「레벨이 쥔 것」이다** (ROADMAP 4막 · 병수님 2026-08-15 17:06).
#   ab_xp(요구 지수 셋)·ab_xpd(벌이 깊이 셋) 여섯 팔이 **어느 것도 안 눕혔다.** 깊이 자체가
#   시간에 대해 가팔라 판 전체가 가속하기 때문이다 — 「눕는가」는 값으로 살 수 없다.
#   제일 나은 팔은 벌이 층^0.5 (12분 Lv 31→13 · 최고층 85%). 그런데 **그대로 켜면
#   골렘(Lv.16)이 영영 안 선다** — 오늘 아침 A-1 을 조용히 깬다.
#   그래서 **한 벌로** 잰다: 벌이 깊이 0.5 + 관문 배율 0.65(구울 4 · 군단 7 · 골렘 10).
#   ★ 끝 조건은 둘이다 — ① kind_probe fresh 가 여전히 통과(세 종이 다 서고 어느 종도 85% 미만)
#                        ② 최고층 합이 base 의 80% 이상. (「눕는가」는 잣대에서 뺐다 — 위 참조)
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MINS=${1:-12}; SEEDS=${2:-1,3,9}; G=${3:-0.65}; D=${4:-0.5}
node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ 관문이 실제로 내려갔나(배율 $G) ═════"
node -e '
  const g = +process.argv[1];
  const L = { bone:1, armor:3, ghoul:6, legion:10, golem:16, rot:1, harvest:4, cheap:8, chain:12, feast:18,
              wand:1, swift:5, deep:9, spirit:13, dark:20 };
  console.log(Object.entries(L).map(([k,v]) => `${k} ${v}→${Math.max(1, Math.round(v*g))}`).join(" · "));
' "$G"

run () {                                   # run <이름> <깊이> <관문>
  local tag=$1 d=$2 g=$3
  for s in ${SEEDS//,/ }; do
    echo "───── $tag (d=$d g=$g) · 씨앗 $s · ${MINS}분 ─────"
    env LH_SEED=$s LH_XPD=$d LH_GATE=$g \
      node tools/loop_health.mjs "$MINS" "tmp/abxg_${tag}_${s}.json" > "tmp/abxg_${tag}_${s}.log" 2>&1
    tail -1 "tmp/abxg_${tag}_${s}.log"
  done
}
run base 1   1
run pair "$D" "$G"

echo "═════ 세 종이 여전히 서나 (kind_probe fresh · 12분 · 실시간) ═════"
env LH_XPD="$D" LH_GATE="$G" node tools/kind_probe.mjs 720 fresh > tmp/abxg_kind_pair.log 2>&1
tail -12 tmp/abxg_kind_pair.log

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - "$SEEDS" <<'PY'
import json, sys, pathlib
seeds = [s for s in sys.argv[1].split(",") if s]
print(f"\n{'팔':>10} │ {'12분 Lv':>8} │ {'앞4분':>6} │ {'뒤4분':>6} │ {'최고층 합':>8} │ {'base 대비':>8} │ {'죽음':>4}")
base = None
for tag, name in (("base","지금"), ("pair","깊이0.5+관문")):
    lv, e4, l4, tops, deaths = [], [], [], [], 0
    for s in seeds:
        p = pathlib.Path(f"tmp/abxg_{tag}_{s}.json")
        if not p.exists(): continue
        r = json.loads(p.read_text())["rows"]
        if len(r) < 8: continue
        L = [x["레벨"] for x in r]
        lv.append(L[-1]); tops.append(max(x["층"] for x in r))
        e4.append((L[3]-L[0])/3); l4.append((L[-1]-L[-4])/3)
        deaths += sum(x.get("죽음", 0) for x in r)
    if not lv: print(f"{name:>10} │ (판 없음)"); continue
    top = sum(tops)
    if base is None: base = top
    print(f"{name:>10} │ {sum(lv)/len(lv):>8.1f} │ {sum(e4)/len(e4):>6.2f} │ {sum(l4)/len(l4):>6.2f} │ "
          f"{top:>8} │ {top/base*100:>7.0f}% │ {deaths:>4}")
print("\n고르는 법: 최고층 합이 base 의 80% 이상이면서, 위 kind_probe 가 세 종을 다 세울 것.")
print("12분 Lv 이 15 아래로 내려오는 것이 이 팔의 목적이다(레벨이 시간 그 자체가 아니게 된다).")
PY
