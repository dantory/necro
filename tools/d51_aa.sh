#!/usr/bin/env bash
# ══ D-51 · 자에 «바닥»이 있나 — 같은 팔을 두 번 돌린다 (A/A) ══ 2026-08-23
#   D-50 의 ㉠ 은 「한 톨도 안 다름」을 요구했는데, 이 자는 판을 **실제 벽시계**로 돌린다
#   (js/main.js:2734 · dt = (t-last)/1000). 씨앗은 Math.random 만 고정하지 틱을 고정하지
#   않으므로 ㉠ 은 원리상 도달할 수 없었고 ㉡ 은 켜질 수밖에 없었다.
#   그래서 **두 팔을 똑같이 D50_PURE=0 으로 두고** 같은 판정기를 돌린다 —
#   그러면 판정기가 찾아내는 모든 차이는 **정의상 잡음**이다. 그 크기가 바닥이다.
#   ★ 자를 한 글자도 안 고쳤다 — d50_run.sh 에서 바뀐 것은 둘째 팔의 D50_PURE 뿐이다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ 팔 ㉠ 문 끔 (__ARMY_PURE=0) — 첫 번째 ══════"
D46_OUT=tmp/d51_a0.json D50_PURE=0 node tools/d46_forks.mjs 40 1,3,5 21 balance
echo "══════ 팔 ㉠' 문 끔 (__ARMY_PURE=0) — 두 번째 · 첫 번째와 한 글자도 안 다르다 ══════"
D46_OUT=tmp/d51_a1.json D50_PURE=0 node tools/d46_forks.mjs 40 1,3,5 21 balance
echo "══════ 같은 판정기로 읽는다 (여기서 켜지는 것은 전부 잡음이다) ══════"
node tools/d50_judge.mjs tmp/d51_a0.json tmp/d51_a1.json
