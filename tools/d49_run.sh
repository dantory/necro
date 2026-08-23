#!/usr/bin/env bash
# ══ D-49 · 「소환수가 왜 13초 만에 죽나」 ══
#   끝 조건 다섯은 tools/d49_judge.mjs 머리말과 docs/ROADMAP.md 의 D-49 항목에
#   **재고 나서가 아니라 재기 전에** 적었다.
#   ★ 자를 새로 만들지 않는다 — D-46/D-47/D-48 의 tools/d46_forks.mjs 를 그대로 쓴다.
#     바뀐 것은 그 자가 판이 이미 들고 있던 소환수 장부(LOST_BY/LOST_DMG · D-20)와
#     새로 더한 세는 칸 둘(LOST_HITS·HERO_TALLY)을 **함께 읽는다**는 것뿐이다.
#   ★ 편성은 **균형** 하나(D-48 의 그 팔) · 씨앗 1·3·5 · 40초 · 문은 안 켠다(__DOC_CORPSE 없음 —
#     균형은 novaMul 1 · keep 0 이라 D-48 의 균형 팔과 같은 판이다).
#   ★ 층을 **셋** 돈다(5 · 13 · 21). 수명이 깊이를 따라 무너지는지가 「몸이 층을 안 따라간다」의
#     유일한 증거다 — 한 층에서만 재면 13초가 설계된 평형인지 안 자란 탓인지 못 가른다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
for F in 5 13 21; do
  echo "══════ 층 $F ══════"
  D46_OUT=tmp/d49_f$(printf %02d $F).json node tools/d46_forks.mjs 40 1,3,5 $F balance
done
D49_SEC=40 node tools/d49_judge.mjs tmp/d49_f05.json tmp/d49_f13.json tmp/d49_f21.json
