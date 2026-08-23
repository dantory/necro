#!/usr/bin/env bash
# ══ D-45 · 「누가 그 자리에서 죽이나」를 한 팔로 잰다 ══
#   끝 조건 다섯은 docs/ROADMAP.md 의 D-45 항목과 tools/d45_who.mjs 머리에
#   **재기 전에** 적어 두었다. 손잡이(A/B)가 없다 — 죽인 주체를 먼저 세는 자다.
#   씨앗 1·3·5 × 40초 × 층 21 — D-42·D-43·D-44 와 같은 자리라 수를 그대로 견준다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
node tools/d45_who.mjs 40 1,3,5 21
