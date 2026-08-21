#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **깊은 층에 «내가 만든 몸»을 되돌린다** (ROADMAP D ㉠·㉡ · core.js HPGROW=3 · `__FLOOR_P`)
#
#   ㉠ 이 찾은 것: 지금(HPGROW=2)은 바닥이 이기는 깊이부터 hpMaxOf 가 `층피해×5` 하나가 된다.
#   45층 죽음 열여덟이 **최대체력 11340 하나로 전부 같았다** — 씨앗도 편성도 레벨도 안 가린다.
#   그런데 바닥에 grow 를 통째로 얹으면(옛 HPGROW=1) 60층에서 「다섯 대」가 「서른 대」가 되어
#   D-7·D-9 가 겨우 세운 깊은 층 위험이 도로 없어진다.
#   → 그 사이를 `floor × grow^p` 로 잇는다. p=0 이 지금, p=1 이 옛것. **값은 재고 고른다.**
#
#   판정 (재기 전에 적는다):
#     ① **몸이 보이는가** — 45·55·65층 죽음의 최대체력이 «한 값»이 아니라 갈려야 한다.
#        끝 조건: 그 층 죽음의 서로 다른 최대체력 가짓수가 **죽음 수의 절반 이상**.
#     ② **앞 6분이 안 물러야 한다** — 앞 6분 죽음이 지금 팔의 ±20% 안.
#     ③ **깊은 층이 도로 안전해지면 안 된다** — 최고층 중앙이 지금 팔의 **115% 아래**.
#   ①만 되고 ③이 새면 p 를 내리고, ①이 안 되면 p 를 올린다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${MIN:-20}
SEEDS=${SEEDS:-"3 9 5 1 2 4"}        # ab_collapse/ab_forgemix 와 **같은 판**이라야 맞댈 수 있다
PS=${PS:-"0.5 1.0"}

node tools/chrome_guard.mjs 2>&1 | tail -2

for p in $PS; do
  tag=$(echo "$p" | tr -d '.')
  OUT="tmp/collapse_fp${tag}"; mkdir -p "$OUT"
  echo "═════ p=$p → $OUT · $(date +%H:%M) ═════"
  for doc in balance flesh; do
    for seed in $SEEDS; do
      f="$OUT/${doc}_${seed}.json"
      [ -s "$f" ] && continue
      LH_SEED=$seed LH_DOC=$doc LH_HPGROW=3 LH_FLOORP=$p \
        node tools/loop_health.mjs "$MIN" "$f" > "$OUT/${doc}_${seed}.log" 2>&1
      echo "== $doc seed$seed 끝 · $(date +%H:%M:%S) ==" >&2
    done
  done
done

echo ""
echo "═════ 지금 팔(tmp/collapse_vow024) ═════"
python3 tools/wall_probe.py tmp/collapse_vow024 2>&1 | tail -30
for p in $PS; do
  tag=$(echo "$p" | tr -d '.')
  echo ""
  echo "═════ p=$p (tmp/collapse_fp${tag}) ═════"
  python3 tools/wall_probe.py "tmp/collapse_fp${tag}" 2>&1 | tail -30
done
