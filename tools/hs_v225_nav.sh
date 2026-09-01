#!/usr/bin/env bash
# ── V-225 ② — 「자의 그래프 간선 규칙」 두 팔 ──────────────────────────────────
# BEFORE = NAV_LEGACY(옛 «두 축 다 >2px 겹침» — 방을 10.7% 확률로 조각냈다)
# AFTER  = 닿음 + 지날 수 있는 폭 ≥48px
# 게임 손잡이는 전부 «현재 바이너리»로 고정(사람 성장 ON · i-frame 0.4s · __V226B ON) — 자만 뒤집는다.
# 볼 것: 층4·5 의 면적/방문(V-226 때 1.9%) · 경로없음·직선폴백 · 그리고 회귀(완주·오류·벽밖).
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
export V225_ARMS=1
export V223_OUT=tmp/hs_v225_nav.json
exec node tools/hs_v221_danger.mjs 0.4 5 1,2,3
