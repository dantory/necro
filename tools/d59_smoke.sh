#!/usr/bin/env bash
# ══ D-59 · 문을 켜고 «작게» 두 번 — 같은 씨앗이 같은 판을 주는지 먼저 본다 ══ 2026-08-23
#   본 재기(100초·씨앗 셋·21층) 전에 값싼 확인부터 한다. 6층·20게임초·씨앗 하나.
#   두 실행의 낮은몫5·끝층·죽음이 «차 0» 이어야 한다. 갈리면 벽시계 자리가 또 있다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㋐1 문 켬(__FIXEDDT=1/60) · 씨앗 1 · 6층 · 20게임초 ══════"
D59_FIX=0.0166667 D46_OUT=tmp/d59_s1.json node tools/d46_forks.mjs 20 1 6 balance
echo "══════ ㋐2 같은 것을 다시(실행만 다르다) ══════"
D59_FIX=0.0166667 D46_OUT=tmp/d59_s2.json node tools/d46_forks.mjs 20 1 6 balance
echo "══════ 끝 ══════"
