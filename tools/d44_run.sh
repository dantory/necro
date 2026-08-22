#!/usr/bin/env bash
# ══ D-44 · 「적이 서는 자리」를 한 팔로 잰다 ══
#   끝 조건 다섯은 docs/ROADMAP.md 의 D-44 항목과 tools/d44_stand.mjs 머리에
#   **재기 전에** 적어 두었다. 손잡이(A/B)가 없다 — 무엇이 세우는지를 먼저 보는 자다.
#   씨앗 1·3·5 × 40초 × 층 21 — D-42·D-43 과 같은 자리라 수를 그대로 견준다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
node tools/d44_stand.mjs 40 1,3,5 21
