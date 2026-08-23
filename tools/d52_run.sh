#!/usr/bin/env bash
# ══ D-52 · 오염을 «한 판 안에서» 센다 ══ 2026-08-23
#   D-50 은 이 크기를 두 판의 차로 재려 했고, D-51 이 그 자의 바닥이 3.3%p 라
#   4.1%p 가 묻힌다는 것을 밝혔다. 여기서는 **자리에서 바로 담는다**(js/battle.js 의 TAINT).
#   ㉠ 켠 팔(기본 · ARMY_PURE=1)에서 오염% 를 읽고,
#   ㉡ 끈 팔(D50_PURE=0 · 옛 길)에서 「깎은몫[근접] ≥ 오염 몫」 항등식으로 담는 자리를 검산한다.
#   ★ 자를 새로 안 만들었다 — d46_forks.mjs 에 칸 하나(오염)를 더한 것뿐이다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ 팔 ㉠ 기본 (문 켬 · ARMY_PURE_DEF=1) ══════"
D46_OUT=tmp/d52_on.json node tools/d46_forks.mjs 40 1,3,5 21 balance
echo "══════ 팔 ㉡ 옛 길 (__ARMY_PURE=0) — 오염이 화력 장부에 얹힌 판 ══════"
D46_OUT=tmp/d52_off.json D50_PURE=0 node tools/d46_forks.mjs 40 1,3,5 21 balance
echo "══════ 끝 ══════"
