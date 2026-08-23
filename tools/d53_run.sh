#!/usr/bin/env bash
# ══ D-53 · 시체폭발의 «반경»이 판보다 큰가 ══ 2026-08-23
#   D-44: 적은 둘레 190~240 에서 나서 10px 걸어 보고 178px 자리에서 죽는다(껍질까지 온 몸 0).
#   D-45/46: 그 자리에서 죽이는 것은 시체폭발이다(편성 넷 다 85~95%).
#   여기서는 그 둘을 잇는 수 하나를 잰다 — `rad = 180 * novaRadMul() * ≤1.5` 대 RING_SPAWN 190.
#   ★ 자를 새로 안 만들었다 — d46_forks.mjs 에 칸 하나(폭발장부)를 더한 것뿐이다.
#   ★ 두 층을 잰다 — 반경이 트리를 타고 자라므로 «깊어질수록 판을 더 덮는지»가 같이 나온다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ 층 21 (D-44·D-45·D-46 과 같은 자리) ══════"
D46_OUT=tmp/d53_f21.json node tools/d46_forks.mjs 40 1,3,5 21 balance
echo "══════ 층 41 (반경이 트리를 타고 자라는가) ══════"
D46_OUT=tmp/d53_f41.json node tools/d46_forks.mjs 40 1,3,5 41 balance
echo "══════ 끝 ══════"
