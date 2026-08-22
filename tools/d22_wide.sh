#!/usr/bin/env bash
# ── D-22b ㉡ · 씨앗을 크게 늘려 «0 대 0.03» 을 다시 잰다 ──────────────────
#
# 짝지어 재 봤더니(tools/d22_pair.sh) 세 무리의 차이가 **안 모였다** —
# −3.00 · −2.83 · **+3.50**. 한 무리는 오히려 올랐다. 곧 같은 씨앗을 써도
# 손잡이가 판을 통째로 갈라 놓아 **씨앗 몫이 안 상쇄된다.** 짝짓기로는 못 읽는다.
#
# 남은 길은 하나 — **씨앗을 늘려 흩어짐을 줄이는 것**뿐이다. 한 무리(20분 ×
# 씨앗 여섯)가 1분이면 끝나니 값싸다. 여기서 새 무리 여섯을 양팔로 돌려,
# 앞서 잰 셋과 합쳐 **팔당 씨앗 쉰넷**을 만든다(표준오차 ±1.1층 ≈ 1.7%).
# 그래야 문턱 5%(3.25층)를 세 배 눈금으로 볼 수 있다.
. "$(dirname "$0")/ab_guard.sh"
set -u
cd "$(dirname "$0")/.."
node tools/chrome_guard.mjs >/dev/null 2>&1 || true

G_D=14,16,18,20,22,24 ; G_E=25,27,29,31,33,35 ; G_F=26,28,30,32,34,36
G_G=37,39,41,43,45,47 ; G_H=38,40,42,44,46,48 ; G_I=49,51,53,55,57,59

run() {  # run <이름> <씨앗들> <손잡이>
  local tag=$1 seeds=$2 k=$3 out
  [ "$k" = "0" ] && out="tmp/d22w_${tag}_base.log" || out="tmp/d22w_${tag}_on.log"
  echo "── 무리 $tag · __GATE_MIN=$k ──"
  NECRO_KNOBS="__GATE_MIN=$k" node tools/start_probe.mjs 20 "$seeds" > "$out" 2>&1
  echo "  끝 · $(wc -l < "$out") 줄"
}
for pair in D:$G_D E:$G_E F:$G_F G:$G_G H:$G_H I:$G_I; do
  run "${pair%%:*}" "${pair##*:}" 0
  run "${pair%%:*}" "${pair##*:}" 0.03
done

top() { awk '$1=="1200"{print $2}' "$1" | tail -1; }
echo
echo "════ 무리별 · 20분(1200초) 층 · 0 → 0.03 ════"
printf "  A : 65.83 → 62.83\n  B : 68 → 65.17\n  C : 61.33 → 64.83\n"
for t in D E F G H I; do
  printf "  %s : %s → %s\n" "$t" "$(top tmp/d22w_${t}_base.log)" "$(top tmp/d22w_${t}_on.log)"
done
