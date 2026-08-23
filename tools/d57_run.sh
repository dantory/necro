#!/usr/bin/env bash
# ══ D-57 · 「되세우는 손을 잠그면」 을 «새 자»로 다시 읽는다 ══ 2026-08-23
#   D-29~D-39 열한 갈래는 전부 «사건 수 / 총량(판당 × 회복초중앙)» 계열의 자로 닫혔다.
#   D-55 가 그 계열의 A/A 바닥(5)이 A/B 신호(4)보다 크다는 것을 보였고, D-56 이 대신
#   «군세가 문턱 아래에 있던 초의 몫»(낮은몫5 · 바닥 0.73%p · 문턱 6%p)을 세웠다.
#   그러니 열한 판정 중 적어도 몇은 «자 때문에» 닫혔을 수 있다. 제일 먼저 되읽을 것은
#   D-30(__RAISECHOKE) 이다 — 그 판정의 근거가 「세움/분이 되레 는다」라는 **속도** 값인데,
#   새 자는 **머문 시간**을 본다. 시도가 늘면서도 군세가 작게 오래 머무는 것은 겹칠 수 있다.
#   끝 조건은 docs/ROADMAP.md 의 「D-57」 절에 재기 «전»에 적어 두었다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㋐ 문 닫힘(기본) · 씨앗 1,3,5 ══════"
D46_OUT=tmp/d57_a_off.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ ㋑ 문 켬 __RAISECHOKE=3 · 씨앗 1,3,5 ══════"
D57_CHOKE=3 D46_OUT=tmp/d57_b_choke3.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ 끝 ══════"
