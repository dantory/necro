#!/usr/bin/env bash
# ══ D-50 · 「자를 고친 값」 — ARMY_PURE 문 A/B ══ 2026-08-23
#   끝 조건 다섯은 tools/d50_judge.mjs 머리말과 docs/ROADMAP.md 의 D-50 항목에
#   **재고 나서가 아니라 재기 전에** 적었다.
#   ★ 자를 새로 만들지 않는다 — D-46/D-47/D-49 의 tools/d46_forks.mjs 를 그대로 쓴다.
#     더한 것은 문 하나뿐(`D50_PURE` → globalThis.__ARMY_PURE). 안 주면 옛 판과 같다.
#   ★ 편성 **균형** 하나 · 씨앗 1·3·5 · 40초 · 층 21 — D-49 가 잰 그 자리다.
#     두 팔은 문 말고 한 글자도 안 다르므로, 판이 움직이면 그것은 문 때문이다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ 팔 ㉠ 문 끔 (__ARMY_PURE=0 · 옛 값) ══════"
D46_OUT=tmp/d50_p0.json D50_PURE=0 node tools/d46_forks.mjs 40 1,3,5 21 balance
echo "══════ 팔 ㉡ 문 켬 (__ARMY_PURE=1) ══════"
D46_OUT=tmp/d50_p1.json D50_PURE=1 node tools/d46_forks.mjs 40 1,3,5 21 balance
node tools/d50_judge.mjs tmp/d50_p0.json tmp/d50_p1.json
