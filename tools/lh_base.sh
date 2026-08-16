#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **base 회귀표를 다시 잰다** (D-4 뒤 · 2026-08-15)
#   D-4 로 「위로만인 유니크는 저절로 껴진다」가 되면서, `loop_health` 의 base 가 기대던
#   자리 하나가 깨졌다 — 예전엔 자동판이 유니크를 **못 껴서** 옛 표(씨앗 1·3·9 = 24·19·10)
#   가 유지됐다. 이제는 f≥10 전리품 12개마다 떨어지는 유니크가 껴지므로 표가 움직인다.
#   **코드를 되돌리는 일이 아니라 표를 갈아 끼우는 일이다**(게임이 일부러 달라졌다).
#
#   그래서 옛 표와 **같은 조건**으로만 잰다 — 씨앗 1·3·9 · 12분 · 투자 없음(base).
#   나오는 값이 곧 새 회귀선이다. 겸사겸사 「유니크를 실제로 꼈나」도 같이 본다 —
#   안 꼈다면 표는 안 움직여야 하고, 움직였다면 그건 D-4 가 아니라 다른 것이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS="1 3 9"
MINS=${1:-12}
node tools/chrome_guard.mjs 2>&1 | tail -2
for s in $SEEDS; do
  echo "───────── base · SEED $s · ${MINS}분 ─────────"
  env LH_SEED=$s node tools/loop_health.mjs "$MINS" "tmp/lhbase_$s.json" 2>&1 | tail -4
done

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
OLD = {1: 49, 3: 58, 9: 53}          # 지금 회귀표 (2026-08-17 · 슬롯 여섯 뒤)
                                     #   24·19·10 (⑥, D-4 이전) → 34·57·46 (08-15) → 49·58·53
print("씨앗   옛최고층 → 새최고층   레벨  군세  낀것점수")
for s in (1, 3, 9):
    p = pathlib.Path(f"tmp/lhbase_{s}.json")
    if not p.exists():
        print(f"  {s}      {OLD[s]} → (없음 — 판이 안 돌았다)"); continue
    r = json.load(p.open())["rows"][-1]
    mark = "그대로" if r["최고층"] == OLD[s] else "★움직임"
    print(f"  {s}      {OLD[s]} → {r['최고층']}  {mark}   "
          f"Lv{r['레벨']}  군세{r['군세']}  점수{r['낀것점수']}")
print()
print("→ 값이 움직였으면 docs/ROADMAP.md ⑥ 회귀표와 js/core.js QUESTS 주석의 숫자를 이걸로 갈아 끼운다.")
PY
