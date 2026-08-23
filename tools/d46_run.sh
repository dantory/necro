#!/usr/bin/env bash
# ══ D-46 ㉠ · 「폭발 92% 가 판의 성질인가 균형 편성의 성질인가」를 편성 넷으로 가른다 ══
#   끝 조건 다섯은 docs/ROADMAP.md 의 D-46 항목과 tools/d46_forks.mjs 머리에
#   **재기 전에** 적어 두었다. 자는 D-45 의 장부를 그대로 읽고, 바뀌는 것은
#   들어가기 전에 박는 `__DOCTRINE` 한 줄뿐이라 balance 팔은 D-45 와 그대로 견준다.
#   편성 넷 × 씨앗 1·3·5 × 40초 × 층 21 — D-42~D-45 와 같은 자리다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
node tools/d46_forks.mjs 40 1,3,5 21 balance,bone,flesh,wall
