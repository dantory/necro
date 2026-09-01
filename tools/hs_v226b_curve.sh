#!/usr/bin/env bash
# ── V-226B — 「적 dmg 곡선을 hp 곡선에서 뗐는가」 두 팔 ─────────────────────────
# BEFORE = __V226B=false (옛 한 곡선 dmg=hp=1+층×0.35 · 2026-09-01 18:57 측정과 같은 조건)
# AFTER  = __V226B=true  (dmg 1+층×0.14 · hp 는 1+층×0.35 그대로)
# 두 팔 모두 사람 성장 ON(__V226_GROW) · i-frame 0.4s 고정 — 곡선 손잡이만 뒤집는다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.."
export V226B_ARMS=1
export V223_OUT=tmp/hs_v226b_curve.json
exec node tools/hs_v221_danger.mjs 0.4 5 1,2,3
