#!/usr/bin/env bash
# ══ D-54 · 반경을 줄이면 «위험»이 돌아오는가 — A/B ══ 2026-08-23
#   ㉠ 기본(180) · ㉡ __NOVA_RAD=90(절반). 자·씨앗·층·초는 D-53b 와 같게 둔다
#   (씨앗 1,3,5 × 층 21 × 100초 × 균형) — 그래야 D-53b 의 수와 그대로 견준다.
#   끝 조건은 docs/ROADMAP.md 의 「D-54」 절에 재기 «전»에 적어 두었다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㉠ 기본 (반경밑값 180 · 문 안 엶) ══════"
D46_OUT=tmp/d54_a180.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ ㉡ 절반 (__NOVA_RAD=90) ══════"
D54_RAD=90 D46_OUT=tmp/d54_b90.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ 끝 ══════"
