#!/usr/bin/env bash
# ── D-22b ㉡ · 「20분 최고층」의 씨앗 잡음 폭을 먼저 잰다 ────────────────────
#
# D-22b 는 __GATE_MIN=0.03 에서 최고층이 65.8 → 62.8 (−4.6%) 로 내렸다고 읽었고,
# 끝 조건 ㉡ 은 「5% 넘게 안 깎인다」다. 곧 판정이 문턱 코앞에서 갈린다.
# 그런데 그 −4.6% 가 **손잡이가 낸 차이인지 씨앗이 낸 차이인지 모른다**
# ([[seed-the-probe]]). 그래서 손잡이를 건드리지 않고(기본 0) **씨앗 무리만 바꿔**
# 같은 자로 세 번 잰다. 무리끼리의 폭이 곧 이 자의 «못 읽는 폭»이다.
#
#   무리 A = 1,3,7,9,11,13   ← 이미 있다(65.8 · tmp/d22c_base.log)
#   무리 B = 2,4,6,8,10,12
#   무리 C = 5,15,17,19,21,23
#
# 폭이 4.6% 보다 크면 D-22b 의 표는 «값을 고를 자»가 못 된다 — 씨앗을 늘려야 한다.
. "$(dirname "$0")/ab_guard.sh"
set -u
cd "$(dirname "$0")/.."
node tools/chrome_guard.mjs >/dev/null 2>&1 || true

run() {  # run <이름> <씨앗들>
  echo "── 무리 $1 · 씨앗 $2 · 20분 · __GATE_MIN=0 ──"
  node tools/start_probe.mjs 20 "$2" > "tmp/d22n_$1.log" 2>&1
  echo "  끝 · $(wc -l < "tmp/d22n_$1.log") 줄"
}
run B 2,4,6,8,10,12
run C 5,15,17,19,21,23

echo
echo "════ 무리별 20분(1200초) 층 ════"
for g in B C; do
  printf "  무리 %s : " "$g"
  awk '$1=="1200"{print $2}' "tmp/d22n_$g.log" | tail -1
done
printf "  무리 A : "; awk '$1=="1200"{print $2}' tmp/d22c_base.log | tail -1
