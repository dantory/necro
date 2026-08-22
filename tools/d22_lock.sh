#!/usr/bin/env bash
# ── D-22b ㉠ · 장판에 제 곱을 준 뒤 값을 못 박는다 (0.05 · 0.07) ─────────────
#
# 고친 자(D-22d)로 재니 한 손잡이가 셋을 같이 못 세운다 —
# 0.05 에서 저주 15.2 · 장판 5.5 · 돌진 28.4. 그래서 `GATE_MUL.pool = 2.5` 를
# 두어 장판만 끌어올렸다(5.5 × 2.5 ≈ 13.8 을 노린다).
#
# 여기서 읽을 것은 둘이다:
#   ㉠ 저주·장판이 **둘 다 10% 이상**인가
#   ㉡ 최고층이 안 깎이는가 — 장판은 맞은 대수가 12만이라 가장 무거운 수법이다.
#      0.10 은 이미 −10.3% 로 떨어졌으니(같은 씨앗 24) 0.07 이 천장 근처인지도 본다.
#   ㉢ 앞 6분 죽음(기준 4.17)
# ★ 0 팔은 다시 안 돈다 — 이 고침은 `__GATE_MIN=0` 에서 **바이트까지 노옵**임을
#   확인했다(tmp/d22e_noop_old.log = tmp/d22e_noop_new.log). 기준선은 그대로
#   64.67층 · 저주 3.6 · 장판 4.8 · 죽음 4.17 이다.
. "$(dirname "$0")/ab_guard.sh"
set -u
cd "$(dirname "$0")/.."
node tools/chrome_guard.mjs >/dev/null 2>&1 || true

SEEDS=1,3,7,9,11,13,2,4,6,8,10,12,5,15,17,19,21,23,14,16,18,20,22,24

for k in 0.05 0.07; do
  out="tmp/d22l_${k}.log"
  echo "── __GATE_MIN=$k · 장판곱 2.5 · 씨앗 24 · 20분 ──"
  NECRO_KNOBS="__GATE_MIN=$k" node tools/start_probe.mjs 20 "$SEEDS" > "$out" 2>&1
  echo "  끝 · $(wc -l < "$out") 줄"
done

echo
echo "════ 장판곱 2.5 · 씨앗 24 · 20분 ════"
printf "%8s %10s %10s %10s %10s %10s\n" 손잡이 저주이빨% 장판이빨% 돌진이빨% 20분최고층 앞6분죽음
printf "%8s %10s %10s %10s %10s %10s\n" "0(기준)" 3.6 4.8 38.8 64.67 4.17
for k in 0.05 0.07; do
  f=tmp/d22l_${k}.log
  cu=$(awk '$1=="curse"{print $4}'  "$f" | tail -1)
  ch=$(awk '$1=="charge"{print $4}' "$f" | tail -1)
  po=$(grep -o '한 장판당 이빨 [0-9.]*%' "$f" | tail -1 | grep -o '[0-9.]*')
  fl=$(awk '$1=="1200"{print $2}'   "$f" | tail -1)
  de=$(awk '$1=="360" {print $NF}'  "$f" | tail -1)
  printf "%8s %10s %10s %10s %10s %10s\n" "$k" "${cu:--}" "${po:--}" "${ch:--}" "${fl:--}" "${de:--}"
done
