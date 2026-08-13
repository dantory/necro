#!/usr/bin/env bash
# ── 적이 나오는 둘레(RING_SPAWN)를 좁히면 층당 시간이 주는가 ────────────────
# 2026-08-13. 벽은 세기가 아니라 **시간**이고, 그 시간의 절반이 「걸어가는 것」이다
# (뒷정리 43% 중 다가감 36%). 표적 반경을 푸는 손잡이는 해 봤고 나빴다
# (js/battle.js 「✗ 줄이 비면 구역제를 푼다」) — 이번엔 **거리 자체**를 줄인다.
#
# 지키는 선: 층합(씨앗 3+7+13 최고층) 76 이상. 못 지키면 그 값은 버린다.
. "$(dirname "$0")/ab_guard.sh"

cd /Users/lbs/source/personal/necro
OUT=/Users/lbs/.openclaw/workspace/tmp/necro_spawnring.txt
: > "$OUT"
orig=$(grep -n 'export const RING_SPAWN = ' js/battle.js | cut -d: -f1)

run () {                      # $1 = 값
  python3 - "$1" <<'PY'
import sys,re
v=sys.argv[1]; p='js/battle.js'; s=open(p,encoding='utf-8').read()
s=re.sub(r'export const RING_SPAWN = \d+;', f'export const RING_SPAWN = {v};', s, count=1)
open(p,'w',encoding='utf-8').write(s)
PY
  echo "════ RING_SPAWN = $1 ════" >> "$OUT"
  for S in 3 7 13; do
    line=$(LH_SEED=$S node tools/loop_health.mjs 12 /tmp/lh_sr_${1}_$S.json 2>&1 | sed -n '12p')
    tm=$(LH_SEED=$S node tools/loop_health.mjs 12 /tmp/lh_sr2_${1}_$S.json 2>&1 | grep "새 땅 한 층당")
    echo "씨앗 $S · $line" >> "$OUT"
    echo "        $tm" >> "$OUT"
  done
}

git stash -q && cp js/battle.js /tmp/sr_base.js && git stash pop -q
for v in 300 240 190; do run "$v"; done
# 원래 값으로 되돌린다 — 어떤 값을 택할지는 사람이 정한다
python3 - <<'PY'
import re; p='js/battle.js'; s=open(p,encoding='utf-8').read()
open(p,'w',encoding='utf-8').write(re.sub(r'export const RING_SPAWN = \d+;','export const RING_SPAWN = 300;',s,count=1))
PY
echo "── 끝. 원래 값(300)으로 되돌려 놓음 ──" >> "$OUT"
