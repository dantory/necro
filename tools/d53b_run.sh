#!/usr/bin/env bash
# ══ D-53b · 표본 조건 ②를 채우는 되잼 ══ 2026-08-23
#   D-53 1차는 판마다 폭발이 15~19회뿐이라 «판마다 30회» 문턱을 못 채웠다(모은 값은 50·54).
#   자·씨앗·층을 그대로 두고 «시간만» 40 → 100 초로 늘린다 — 그러면 판마다 35~45 회가 된다.
#   ★ 층이 도중에 더 내려가 트리가 자랄 수 있다 — 그러면 radMax 가 평균보다 커지므로
#     그 자체가 ㉣(깊이가 반경을 키우는가)의 곁증거로 남는다. 숨기지 말고 같이 읽는다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ 층 21 · 100초 (표본 되잼) ══════"
D46_OUT=tmp/d53b_f21.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ 층 41 · 100초 (표본 되잼) ══════"
D46_OUT=tmp/d53b_f41.json node tools/d46_forks.mjs 100 1,3,5 41 balance
echo "══════ 끝 ══════"
