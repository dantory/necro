#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **깊은 층 생존이 통째로 세진 것을 사람이 겪는 자로 잰다** (ROADMAP C-㉡ 의 ⚠ · D 의 몫).
#
#   08-21 에 `hpMaxOf` 를 고쳤다 — 바닥을 바닥으로 되돌리고 키운 몫을 그 위에 곱한다.
#   손잡이는 돌기 시작했다(죽는 층 14·22·25·29 → 넷 다 200층까지). 그런데 그때 잰 것은
#   **「몇 층에서 죽나」 하나뿐**이고, 60층에서 「다섯 대」가 「서른 대」가 됐다.
#   그 말은 **판이 통째로 쉬워졌을 수도 있다**는 뜻이다 — 자를 안 대고 넘기면
#   D(난이도)를 재는 자리에서 원인을 못 찾는다.
#
#   그래서 사람이 겪는 셋을 20분 판으로 나란히 본다: **죽음 · 최고층 · 레벨.**
#   팔은 `LH_HPGROW` 하나다(core.js `__HPGROW`) — 1 이 지금, 0 이 08-21 이전 식이다.
#   ★ 맨몸은 두 팔이 **한 톨도 다르지 않다**(배수 1) — 갈리는 것은 강화를 산 뒤부터다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS=${SEEDS:-"1 3 7 9"}
MIN=${MIN:-20}

node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ 예전(max) ↔ 지금(배수) · 씨앗 [$SEEDS] × ${MIN}분 · $(date +%H:%M) ═════"
for s in $SEEDS; do
  echo "───────── SEED $s · 예전 · $(date +%H:%M) ─────────"
  LH_SEED=$s LH_HPGROW=0 node tools/loop_health.mjs "$MIN" "$OUT/hpg_old_$s.json" 2>&1 | tail -1
  echo "───────── SEED $s · 지금 · $(date +%H:%M) ─────────"
  LH_SEED=$s LH_HPGROW=1 node tools/loop_health.mjs "$MIN" "$OUT/hpg_new_$s.json" 2>&1 | tail -1
done

echo ""
echo "═════ 판정 ═════"
SEEDS="$SEEDS" MIN="$MIN" node - <<'JS'
import fs from "node:fs";
const SEEDS = (process.env.SEEDS || "1 3 7 9").trim().split(/\s+/);
const MIN = +(process.env.MIN || 20);
const ARMS = [["old", "예전"], ["new", "지금"]];
const R = {};
for (const [a] of ARMS) {
  const acc = { 최고층: [], 죽음: [], 레벨: [], 군세: [], n: 0 };
  for (const s of SEEDS) {
    let j; try { j = JSON.parse(fs.readFileSync(`tmp/hpg_${a}_${s}.json`, "utf8")); } catch { continue; }
    const rows = j.rows || []; if (!rows.length) continue;
    acc.n++;
    acc.최고층.push(rows[rows.length - 1].최고층);
    acc.레벨.push(rows[rows.length - 1].레벨);
    acc.죽음.push(rows.reduce((t, r) => t + r.이번분죽음, 0));
    const 뒤 = rows.filter(r => r.분 > Math.ceil(MIN / 2));
    if (뒤.length) acc.군세.push(뒤.reduce((t, r) => t + r.군세, 0) / 뒤.length);
  }
  R[a] = acc;
}
const m = (x) => x.length ? x.reduce((t, v) => t + v, 0) / x.length : 0;
console.log(` 팔   │ 죽음 │ 최고층 │ 레벨 │ 군세`);
for (const [a, n] of ARMS) {
  const A = R[a];
  if (!A || !A.n) { console.log(`${n} │ 재지 못함`); continue; }
  console.log(`${n} │${m(A.죽음).toFixed(1).padStart(5)} │${m(A.최고층).toFixed(0).padStart(7)} │` +
    `${m(A.레벨).toFixed(0).padStart(5)} │${m(A.군세).toFixed(1).padStart(6)}`);
}
const O = R.old, N = R.new;
console.log("");
if (!O?.n || !N?.n) { console.log("── 판정 ── 한쪽을 못 읽었다."); }
else {
  const d예 = m(O.죽음), d지 = m(N.죽음);
  const 층비 = m(N.최고층) / (m(O.최고층) || 1);
  console.log(`① 죽음 **${d예.toFixed(1)} → ${d지.toFixed(1)}** (${MIN}분 판)`);
  console.log(`② 최고층 ${m(O.최고층).toFixed(0)} → ${m(N.최고층).toFixed(0)} = **${(층비 * 100).toFixed(0)}%**`);
  /* 자를 양쪽으로 연다([[threshold-and-ruler-must-match]] 의 결) — 「안 쉬워졌나」만 보면
     반대쪽(너무 어려워짐)으로 새는 것을 못 잡는다. */
  const 쉬움 = d지 <= d예 * 0.5 || 층비 >= 1.25;
  const 어려움 = d지 >= d예 * 2 || 층비 <= 0.8;
  console.log("");
  console.log(쉬움 ? "☞ **판이 눈에 띄게 쉬워졌다** — D 에서 난이도를 되잡을 몫이 생겼다."
    : 어려움 ? "☞ **오히려 어려워졌다** — 뜻밖이다. 까닭을 찾을 것."
    : "☞ **난이도는 크게 안 움직였다** — 손잡이만 돌게 됐고 판은 그대로다(바라던 결).");
}
JS
