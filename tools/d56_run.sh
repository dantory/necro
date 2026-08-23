#!/usr/bin/env bash
# ══ D-56 · 위험을 «초»로 다시 재는 자의 A/A 바닥 ══ 2026-08-23
#   D-55 가 「무너짐 회수」를 버리라 했다(A/A 바닥 5 > A/B 신호 4 · 부호까지 뒤집힘).
#   새 눈금은 «군세가 문턱 아래에 있던 초 ÷ 던전에서 산 초» 다. 그 자를 믿기 전에
#   **같은 설정에 씨앗만 바꿔** 두 팔을 돌린다 — 그 차가 곧 자의 잡음(A/A 바닥)이다.
#   끝 조건은 docs/ROADMAP.md 의 「D-56」 절에 재기 «전»에 적어 두었다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㋐ 기본 180 · 씨앗 1,3,5 ══════"
D46_OUT=tmp/d56_a135.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ ㋑ 기본 180 · 씨앗 7,9,11 (A/A 짝) ══════"
D46_OUT=tmp/d56_a2_7911.json node tools/d46_forks.mjs 100 7,9,11 21 balance
echo "══════ 끝 ══════"
