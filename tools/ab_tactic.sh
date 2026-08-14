#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **운용(B-2)이 실제로 판을 가르나** — 폭발·저주는 이제 사람이 고른 운용(core.js TACTIC)에서
# 조건을 뽑는다. 넷을 대 보고 **최고층**과 **폭발·저주 횟수**가 갈리는지 본다.
#   steady 평시(기본)  · gate 관문에서만 · hoard 넘칠 때만 · always 늘
# 운용은 LH_TAC 로 주입한다(LH_DOC 와 같은 문 · 코드는 한 줄도 안 바꾼다 — 되돌릴 것이 없다).
# 씨앗 3·9·5 · 12분. 3분짜리 한 판은 표본이 아니라 12분 × 씨앗 셋(loop_health 주석).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"

arm() {                                   # arm <운용>
  for s in 3 9 5; do
    echo "───────── TAC $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s LH_TAC=$1 node tools/loop_health.mjs 12 "$OUT/tac_$1_$s.json" 2>&1 \
      | grep -E '최고|주술|아슬아슬|errors' | head -5
  done
}

for t in steady gate hoard always; do arm "$t"; done

echo ""
echo "═════ 갈렸나 — 운용별 최고층 합 · 폭발 · 저주 ═════"
node - <<'JS'
import fs from "node:fs";
for (const t of ["steady", "gate", "hoard", "always"]) {
  let top = 0, nova = 0, curse = 0, sec = 0, ok = 0;
  for (const s of [3, 9, 5]) {
    try {
      const o = JSON.parse(fs.readFileSync(`tmp/tac_${t}_${s}.json`, "utf8"));
      const last = o.rows[o.rows.length - 1];
      top += last?.최고층 || 0; ok++;
      nova += o.주술?.폭발 || 0; curse += o.주술?.저주 || 0; sec += o.주술?.저주초 || 0;
    } catch { /* 아직 안 끝난 씨앗 */ }
  }
  console.log(`${t.padEnd(7)} 최고층 합 ${String(top).padStart(4)} (${ok}/3) · 폭발 ${String(nova).padStart(4)}번 · 저주 ${String(curse).padStart(4)}번 · 저주지속 ${Math.round(sec)}초`);
}
JS
echo "═════ 끝 · $(date +%H:%M) ═════"
