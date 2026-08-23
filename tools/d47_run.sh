#!/usr/bin/env bash
# ══ D-47 · 「폭발을 «편성의 손잡이»로 만들 수 있는가」를 한 수로 가른다 ══
#   끝 조건 다섯은 docs/ROADMAP.md 의 D-47 항목에 **재고 나서가 아니라 재기 전에** 적었다.
#   ★ 자를 새로 만들지 않는다 — D-46 의 tools/d46_forks.mjs 를 그대로 쓴다(편성 넷 ×
#     씨앗 1·3·5 × 층 21 × 40초 = 12판). 바뀌는 것은 들어가기 전에 박는 한 줄뿐:
#     `globalThis.__DOC_CORPSE = 1` (D47_CORPSE 환경변수). 그래서 D-46 의 수와 그대로 견준다.
#   ★ **균형 팔은 대조군이다** — novaMul 1 · keep 0 이라 문을 켜도 꺼진 판과 같아야 한다.
#     D-46 의 85.3% 에서 10%p 넘게 어긋나면 값이 아니라 **자**를 먼저 의심한다(끝 조건 ③).
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
D47_CORPSE=1 D46_OUT=tmp/d47_corpse.json node tools/d46_forks.mjs 40 1,3,5 21 balance,bone,flesh,wall
