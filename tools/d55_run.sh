#!/usr/bin/env bash
# ══ D-55 · 「무너짐」의 A/A 바닥을 재고 표본을 채운다 ══ 2026-08-23
#   자·층·초·편성은 D-54 와 같게 두고 «씨앗만» 7,9,11 로 바꾼다.
#   판이 결정적이지 않으므로(D-53b 대 D-54 의 ㉠ 이 5~8% 어긋났다) 새 씨앗이 곧 새 표본이고,
#   ㉠(1,3,5) 대 ㉠′(7,9,11) 의 차가 곧 «자의 잡음»(A/A 바닥)이다.
#   끝 조건은 docs/ROADMAP.md 의 「D-55」 절에 재기 «전»에 적어 두었다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㉠′ 기본 180 · 씨앗 7,9,11 (A/A 바닥) ══════"
D46_OUT=tmp/d55_a180.json node tools/d46_forks.mjs 100 7,9,11 21 balance
echo "══════ ㉡′ 절반 __NOVA_RAD=90 · 씨앗 7,9,11 (표본 채움) ══════"
D54_RAD=90 D46_OUT=tmp/d55_b90.json node tools/d46_forks.mjs 100 7,9,11 21 balance
echo "══════ 끝 ══════"
