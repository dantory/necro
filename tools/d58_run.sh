#!/usr/bin/env bash
# ══ D-58 · A/A 바닥을 «실행을 갈라» 다시 잰다 (판시계 자와 벽시계 자를 나란히) ══ 2026-08-23
#   D-57 이 걸린 자리: 같은 명령·같은 씨앗을 한 시간 뒤에 돌렸더니 낮은몫5 가
#   4.2/5.2/3.8 → 5.4/11.2/4.4 로 갈렸다. 까닭은 자가 «벽시계»를 세기 때문이다
#   (js/main.js tick 의 dt 는 0.05 에서 잘리므로, 굼뜬 판은 같은 100 벽초에 게임을 덜 한다).
#   D-58 이 표본마다 S.t 를 같이 찍어 «판의 초»로 재는 자(위험g)를 나란히 냈다.
#   여기서 알 값은 하나다 — **실행이 갈릴 때의 A/A 바닥**이, 판시계 자에서 더 작은가.
#   두 팔은 «같은 씨앗 · 같은 설정 · 문 없음»이고 **실행만 다르다**.
#   끝 조건은 docs/ROADMAP.md 의 「D-58」 절에 재기 «전»에 적어 두었다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㋐1 문 없음 · 씨앗 1,3,5 (첫 실행) ══════"
D46_OUT=tmp/d58_a1.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ ㋐2 문 없음 · 씨앗 1,3,5 (같은 것을 다시 · A/A 짝) ══════"
D46_OUT=tmp/d58_a2.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ 끝 ══════"
