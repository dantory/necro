#!/usr/bin/env bash
# V-203b 스윕 — before + 곱 브래킷을 3 씨앗으로 재서 끝 조건의 «무릎»을 찾는다.
# 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한 회피) — tools/ab_guard.sh.
. "$(dirname "$0")/ab_guard.sh"
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
SEEDS=1,2,3
echo "═════ V-203b 2차 스윕(브래킷 8·12·14) 시작 $(date +%H:%M) · 씨앗 $SEEDS ═════"
for mul in 8 12 14; do
  echo "───────── mul=$mul · $(date +%H:%M) ─────────"
  node tools/hs_v203b.mjs "$mul" 5 "$SEEDS" 2>&1 | tail -40
done
echo "═════ 스윕 끝 $(date +%H:%M) ═════"
grep -h '한 줄:' -A1 tmp/hs_v203b_*.json 2>/dev/null || true
