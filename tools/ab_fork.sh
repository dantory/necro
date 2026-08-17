#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **「소수 정예」가 진짜 갈래인가** (ROADMAP B 의 마지막 물음).
#
#   병수님: 「소수의 하수인이지만 하수인 자체가 강해지는」. 칸은 08-18 에 섰고
#   곱(×0.70)도 `armyCap()` 에게 직접 물어 골랐다. 그런데 **잰 것은 「한 판의 상한」**
#   이었다 — 끝 조건은 「20분 판에서 군세 12~16」인데 상한은 사람이 안 겪는 수다
#   ([[threshold-and-ruler-must-match]]). 상한이 14 라도 마나·시체가 모자라면
#   실제로 서는 것은 8 일 수 있다.
#
#   그래서 **사람이 겪는 두 가지**를 20분 판으로 나란히 잰다:
#     ① 실제 군세(minions.length)가 12~16 에 앉는가 — 상한이 아니라 **선 머릿수**다.
#     ② 정예 갈래가 군단 갈래보다 **못 살지 않는가** — 최고층·죽음·레벨.
#   ②가 뒤집히면(정예가 뚜렷이 못 살면) 그건 갈래가 아니라 **덫**이다. 고르는
#   자리를 만들려고 놓은 칸이 「고르면 손해」면 아무도 안 고른다.
#
#   팔은 `LH_FORK` 하나다(core.js `__AUTO_FORK`) — 목록은 그대로 두고 `legion`
#   자리에 `elite` 만 바꿔 집는다. 갈래 넷 중 **하나만** 움직인다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS=${SEEDS:-"1 3 7 9"}
MIN=${MIN:-20}

node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ 군단 ↔ 정예 · 씨앗 [$SEEDS] × ${MIN}분 · $(date +%H:%M) ═════"
for s in $SEEDS; do
  echo "───────── SEED $s · 군단 · $(date +%H:%M) ─────────"
  LH_SEED=$s node tools/loop_health.mjs "$MIN" "$OUT/fork_legion_$s.json" 2>&1 | tail -1
  echo "───────── SEED $s · 정예 · $(date +%H:%M) ─────────"
  LH_SEED=$s LH_FORK=elite node tools/loop_health.mjs "$MIN" "$OUT/fork_elite_$s.json" 2>&1 | tail -1
done

echo ""
echo "═════ 판정 ═════"
SEEDS="$SEEDS" MIN="$MIN" node - <<'JS'
import fs from "node:fs";
const SEEDS = (process.env.SEEDS || "1 3 7 9").trim().split(/\s+/);
const MIN = +(process.env.MIN || 20);
const ARMS = [["legion", "군단"], ["elite", "정예"]];
/* 「20분 판의 군세」는 **뒤 절반의 평균**으로 본다 — 앞 절반은 아직 크는 중이라
   어느 팔이든 작다(끝 조건이 말하는 것은 다 자란 판의 머릿수다). */
const 반 = Math.ceil(MIN / 2);
const R = {};
for (const [a] of ARMS) {
  const acc = { 군세: [], 상한: [], 최고층: [], 죽음: [], 레벨: [], n: 0 };
  for (const s of SEEDS) {
    let j; try { j = JSON.parse(fs.readFileSync(`tmp/fork_${a}_${s}.json`, "utf8")); } catch { continue; }
    const rows = j.rows || []; if (!rows.length) continue;
    const 뒤 = rows.filter(r => r.분 > 반);
    if (!뒤.length) continue;
    acc.n++;
    acc.군세.push(뒤.reduce((t, r) => t + r.군세, 0) / 뒤.length);
    acc.상한.push(뒤.reduce((t, r) => t + r.상한, 0) / 뒤.length);
    acc.최고층.push(rows[rows.length - 1].최고층);
    acc.레벨.push(rows[rows.length - 1].레벨);
    acc.죽음.push(rows.reduce((t, r) => t + r.이번분죽음, 0));
  }
  R[a] = acc;
}
const m = (x) => x.length ? x.reduce((t, v) => t + v, 0) / x.length : 0;
console.log(` 팔   │ 군세(뒤${MIN - 반}분) │ 상한 │ 최고층 │ 레벨 │ 죽음`);
for (const [a, n] of ARMS) {
  const A = R[a];
  if (!A || !A.n) { console.log(`${n} │ 재지 못함`); continue; }
  console.log(`${n} │${m(A.군세).toFixed(1).padStart(11)} │${m(A.상한).toFixed(1).padStart(5)} │` +
    `${m(A.최고층).toFixed(0).padStart(7)} │${m(A.레벨).toFixed(0).padStart(5)} │${m(A.죽음).toFixed(1).padStart(5)}`);
}
const L = R.legion, E = R.elite;
console.log("");
if (!L?.n || !E?.n) { console.log("── 판정 ── 한쪽을 못 읽었다."); }
else {
  const e군세 = m(E.군세), l군세 = m(L.군세);
  const ok1 = e군세 >= 12 && e군세 <= 16;
  console.log(`① 정예의 실제 군세 **${e군세.toFixed(1)}기** (군단 ${l군세.toFixed(1)}기) — ` +
    (ok1 ? "끝 조건 12~16 **안에 든다**" : `끝 조건 12~16 **밖이다** (${e군세 < 12 ? "모자람" : "넘침"})`));
  const 층비 = m(E.최고층) / (m(L.최고층) || 1);
  const 죽음차 = m(E.죽음) - m(L.죽음);
  /* 「못 살지 않는가」의 자 — 층은 10% 안, 죽음은 한 판에 한 번 안쪽이면 같은 값으로 본다.
     씨앗 넷이라 작은 차이는 잡음이다([[seed-the-probe]]).
     ★ **양쪽을 다 본다.** 못 사는 것만 막으면 반대쪽으로 새어 「고르면 이득」이 되는데,
       그것도 고르는 자리가 아니다 — 둘 중 하나가 정답이면 갈래가 아니라 그냥 정답이다. */
  const ok2 = 층비 >= 0.9 && 층비 <= 1.1 && Math.abs(죽음차) <= 1.0;
  console.log(`② 정예가 «못 살지도 낫지도» 않은가 — 최고층 ${(층비 * 100).toFixed(0)}% (${m(E.최고층).toFixed(0)} 대 ${m(L.최고층).toFixed(0)}) · ` +
    `죽음 ${죽음차 >= 0 ? "+" : ""}${죽음차.toFixed(1)} → ` +
    (ok2 ? "**갈래로 선다**" : 층비 > 1.1 ? "**정답이다** — 고르면 이득이라 고를 게 없다" : "**덫이다** — 고르면 손해다"));
  console.log(`→ ${ok1 && ok2 ? "B 를 닫을 수 있다." : "아직 못 닫는다 — " + (!ok1 ? "머릿수부터 맞춘다(ELITE_CUT)." : "세기를 올린다(ELITE_POW/ELITE_HP).")}`);
}
JS
echo "═════ 끝 · $(date +%H:%M) · 잰 커밋 $(git rev-parse --short HEAD) ═════"
