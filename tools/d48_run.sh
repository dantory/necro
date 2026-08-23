#!/usr/bin/env bash
# ══ D-48 · 「시체를 남겨 줘도 군세가 안 는다 — 무엇이 소환을 막나」 ══
#   끝 조건 다섯은 tools/d48_judge.mjs 머리말과 docs/ROADMAP.md 의 D-48 항목에
#   **재고 나서가 아니라 재기 전에** 적었다.
#   ★ 자를 새로 만들지 않는다 — D-46/D-47 의 tools/d46_forks.mjs 를 그대로 쓴다
#     (편성 넷 × 씨앗 1·3·5 × 층 21 × 40초 = 12판 · __DOC_CORPSE=1 로 D-47 과 같은 판).
#     바뀐 것은 그 자가 판이 이미 들고 있던 소환 장부(RAISE_TALLY)도 **함께 읽는다**는 것뿐이다.
#   ★ 균형 팔이 대조군이다 — novaMul 1 · keep 0 이라 문이 꺼진 판과 같아야 한다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
D47_CORPSE=1 D46_OUT=tmp/d48_summon.json node tools/d46_forks.mjs 40 1,3,5 21 balance,bone,flesh,wall
node tools/d48_judge.mjs tmp/d48_summon.json
