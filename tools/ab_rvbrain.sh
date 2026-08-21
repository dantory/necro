#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ D-16 · ㉯ 「문을 안 써도 되짚기가 싸지게」 ═══════════════════════════════
# D-15 가 남긴 물음: 기본값이 「문이 열리면 저절로 깊은 데서」로 옮겨졌으므로 «문 안 씀»은
# 이제 **일부러 「처음부터」를 고른 사람**이다. 그 사람에게는 되짚기 31% · 뒤후퇴폭 79%
# 가 그대로 있다. 되짚기를 싸게 하는 손잡이는 ⑧-e 의 빨리 감기(FF)인데, **올릴 수가
# 없었다** — 씨앗 3·균형·8분에서 FF 10 은 죽음이 **3 → 72** 로 터진다.
#
# 까닭을 찾았다: 빨리 감는 동안 **머리(auto)가 굶는다.** 안쪽 step 은 판만 돌리고
# auto() 는 바깥 고리가 제 dt 로만 세므로, FF 배수만큼 소환할 차례를 못 얻는다.
# ROADMAP J 가 `S.speed` 에서 **이미 한 번 고친 결함**인데 되짚기 쪽엔 안 옮겨졌다
# ([[carry-fixes-forward]]). battle.js ⑧-f 가 그 자리를 고쳤다(`__RV_BRAIN`).
# 손으로 대 본 것(씨앗 3·균형·8분·「처음부터」): FF 10 죽음 **72 → 5**.
#
# 판정 (재기 전에 적는다 · tools/d_gate.py 의 ①~⑥ 그대로):
#   · 되돌릴 문(`LH_RVBRAIN=0`)은 옛 판과 **바이트로 같아야** 한다 — 확인함(8분 판).
#   · 새 팔이 서려면 «문 안 씀» 에서 ⑤되짚기 ≤ 20% 이면서 ②·③이 기준을 안 무너뜨려야
#     한다. ⑤ 만 좋아지고 ③(앞 6분 죽음)이 ±10% 를 넘으면 **떨어뜨린다** — 앞은 한 톨도
#     안 물려야 한다.
#   · 어느 FF 가 이겨도 «문 씀» 팔(게임 기본값)에서 다시 재기 전에는 안 넣는다(다음 걸음).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${MIN:-20}
SEEDS=${SEEDS:-"3 9 5 1 2 4"}      # ab_collapse/ab_doc 와 같은 판이라야 맞댈 수 있다

# 팔 이름 = 「머리 도는가·빨리 감기 배수」. 전부 **문 안 씀**(LH_DIVEDEF=0)이다.
#   b0ff3 = 오늘의 판(기준) · b1ff3/6/10 = 머리를 먹인 뒤 배수를 올려 본 것
for arm in "0 3" "1 3" "1 6" "1 10"; do
  brain=${arm% *}; ff=${arm#* }
  OUT="tmp/d16_b${brain}ff${ff}"; mkdir -p "$OUT"
  for doc in balance flesh; do
    for seed in $SEEDS; do
      f="$OUT/${doc}_${seed}.json"
      [ -s "$f" ] && continue
      LH_SEED=$seed LH_DOC=$doc LH_DIVEDEF=0 LH_RVBRAIN=$brain LH_RVFF=$ff \
        node tools/loop_health.mjs "$MIN" "$f" > "$OUT/${doc}_${seed}.log" 2>&1
      echo "== $OUT $doc seed$seed 끝 · $(date +%H:%M:%S) ==" >&2
    done
  done
done

echo
echo "══ D-16 · «문 안 씀» 팔에서 머리를 먹이고 배수를 올린다 (${MIN}분 × 씨앗 6 × 편성 2) ══"
for ff in 3 6 10; do
  echo
  echo "── 머리 돎 · FF ${ff} ──"
  python3 tools/d_gate.py --base "문안씀=tmp/d16_b0ff3" "문씀=tmp/collapse_def_d15" \
    "새문안씀(머리·ff${ff})=tmp/d16_b1ff${ff}" "문씀그대로=tmp/collapse_def_d15"
done
