#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ D-11 · **몸이 보이면서도 깊은 층이 위험하게** (battle.js GATE_VOW_LIFT) ═══════
#
#   D-10 이 두 끝을 배타로 만들어 놓고 끝났다:
#     · 지금(p=0)      45층 죽음 18 · 그런데 **최대체력이 11340 «하나»** — 몸이 안 보인다
#     · 몸보임(p=0.5)  최대체력은 갈리는데 **45·65층 죽음이 0** — 위험이 없어진다
#   까닭은 몸만 커지고 위협은 제자리라서다(웅덩이 몫 17% → 6%).
#   → 위협에 **몸이 커진 그 배수**(hpFloorLift)를 그대로 곱한다. q=1 이면 몫이 유지된다.
#   문이 도는지는 재기 전에 봤다(`tools/vowlift_check.mjs`): 기본값 무해(배수 1) ·
#   얕은 층은 p 를 켜도 배수 1(앞 6분에 못 닿는다) · 깊은 층 웅덩이 몫 17% 그대로.
#
#   판정 (재기 전에 적는다 · 견줄 두 팔은 이미 디스크에 있다):
#     기준 = tmp/collapse_vow024 (지금) · 몸보임만 = tmp/collapse_fp05 (D-10, 실패한 팔)
#     ① **몸이 보이는가** — 45·55·65층 죽음의 서로 다른 최대체력 가짓수가 죽음 수의 절반 이상.
#        (기준 팔은 45층 18죽음이 «한 값»이라 여기서 진다. fp05 는 죽음이 0 이라 헛되이 이긴다.)
#     ② **깊은 층 위험이 살아 있는가** — 25층+ 죽음이 기준 팔(22)의 **80% 이상**.
#        ①과 ②를 **같이** 넘는 팔은 아직 하나도 없다 — 그것이 D-11 이 있는 까닭이다.
#     ③ **앞 6분이 안 물러야 한다** — 앞 6분 죽음이 기준 팔(61)의 ±20% 안.
#        (산수로는 배수가 1 이라 안 바뀌어야 한다 — 어긋나면 자나 문 어느 쪽이 샌 것이다.)
#     ④ **깊은 층이 도로 안전해지면 안 된다** — 최고층 중앙이 기준 팔(65)의 115% 아래.
#   ①②를 같이 넘으면 q 를 기본값으로 옮긴다. ②만 새면 q 를 올리고, ③이 새면 문을 의심한다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${MIN:-20}
SEEDS=${SEEDS:-"3 9 5 1 2 4"}        # collapse/forgemix/floorp 와 **같은 판**이라야 맞댈 수 있다
QS=${QS:-"1.0"}
P=${P:-0.5}

node tools/chrome_guard.mjs 2>&1 | tail -2

for q in $QS; do
  tag=$(echo "$q" | tr -d '.')
  OUT="tmp/collapse_vl${tag}"; mkdir -p "$OUT"
  echo "═════ q=$q (p=$P) → $OUT · $(date +%H:%M) ═════"
  for doc in balance flesh; do
    for seed in $SEEDS; do
      f="$OUT/${doc}_${seed}.json"
      [ -s "$f" ] && continue
      LH_SEED=$seed LH_DOC=$doc LH_HPGROW=3 LH_FLOORP=$P LH_VOWLIFT=$q \
        node tools/loop_health.mjs "$MIN" "$f" > "$OUT/${doc}_${seed}.log" 2>&1
      echo "== $doc seed$seed 끝 · $(date +%H:%M:%S) ==" >&2
    done
  done
done

for d in tmp/collapse_vow024 tmp/collapse_fp05; do
  echo ""
  echo "═════ 견줄 팔: $d ═════"
  python3 tools/wall_probe.py "$d" 2>&1 | tail -30
done
for q in $QS; do
  tag=$(echo "$q" | tr -d '.')
  echo ""
  echo "═════ q=$q · p=$P (tmp/collapse_vl${tag}) ═════"
  python3 tools/wall_probe.py "tmp/collapse_vl${tag}" 2>&1 | tail -30
done
