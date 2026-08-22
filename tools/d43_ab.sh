#!/usr/bin/env bash
# ══ D-43 · 문(__GRIP)을 켠 팔과 끈 팔을 같은 씨앗으로 잰다 ══
#   끝 조건 다섯은 docs/ROADMAP.md 의 D-43 항목에 **재기 전에** 적어 두었다.
#   ③ 을 지키려 씨앗 셋(1·3·5) · 두 팔 다 40초 · 층 21.
#   g=1 로 먼저 친다 — 문이 낼 수 있는 **가장 센 값**이라, 여기서도 ㉮ 가 0 이면
#   ⑤㉢(「이 갈래도 아니다」)이 한 번에 갈린다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "════════ A팔 · 문 끔(예전 그대로) ════════"
D42_OUT=tmp/d43_off.json  node tools/d42_walk.mjs 40 1,3,5 21
echo "════════ B팔 · 문 켬(g=1) ════════"
D43_GRIP=1 D42_OUT=tmp/d43_on.json node tools/d42_walk.mjs 40 1,3,5 21
