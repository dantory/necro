#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **㉧ 자리를 내준다** — 「골렘이 왜 안 서나」의 마지막 고리(ROADMAP E 「골렘 해금이 판의 절반을」).
#   나무를 Lv.16 → Lv.10 으로 당겨 해금을 85초 앞당겼는데 **선 기수는 1.2 그대로**였다.
#   미해금에서 뺀 15% 를 **꽉참이 고스란히 받아먹었다**(33→40%) — 열렸을 땐 이미 해골이
#   칸을 다 차지한 뒤다. 그래서 값이 아니라 **채우는 차례**를 고친 팔이 __SLOT_YIELD 다:
#   편성이 골렘을 더 원하는데 자리가 없으면 제일 약한 해골 하나를 물러나게 한다.
#
#   같은 자(ab_golem.sh 와 같은 통)를 팔 둘로 돌린다 — off(지금) · on(㉧).
#   편성 wall(제일 많이 원함) · 씨앗 3·9·5 · 12분.
#
#   끝 조건(ROADMAP): **원한 기수의 70% 이상이 실제로 선다**(지금 34%) ·
#   첫등장이 판의 25% 안(지금 43%) · 그리고 **최고층이 안 깎여야 한다**(해골을 물리는
#   대가가 있으므로 — ㉡ over 가 정확히 여기서 졌다: 자리를 열고 그 자리를 못 채웠다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS=${SEEDS:-"3 9 5"}
DOC=${DOC:-wall}

node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ ㉧ 자리를 내준다 · 편성 $DOC × 씨앗 [$SEEDS] × 팔 off·on × 12분 · $(date +%H:%M) ═════"
for arm in off on; do
  for s in $SEEDS; do
    echo "───────── ARM $arm · SEED $s · $(date +%H:%M) ─────────"
    LH_SLOTYIELD=$([ "$arm" = on ] && echo 1 || echo 0) \
    LH_SEED=$s LH_DOC=$DOC node tools/loop_health.mjs 12 "$OUT/slot_${arm}_$s.json" 2>&1 \
      | grep -E '^골렘|더 원한|골렘을 막는|최고|errors' | head -6
  done
done

echo ""
echo "═════ 판정 ═════"
SEEDS="$SEEDS" node - <<'JS'
import fs from "node:fs";
const SEEDS = (process.env.SEEDS || "3 9 5").trim().split(/\s+/).map(Number);
const ARMS = ["off", "on"];
const KEYS = ["미해금", "상한참", "재사용", "마나부족", "시체없음", "셀차례"];
const HD = { 미해금: "미해금", 상한참: "꽉참", 재사용: "재사용", 마나부족: "마나", 시체없음: "시체", 셀차례: "셀차례" };
const acc = {};
console.log("  팔  │ 원함 │ 선것 │  % │ 첫등장 │ 판의% │ 최고층합 │ " + KEYS.map(k => HD[k].padStart(6)).join(" │ "));
for (const a of ARMS) {
  let n = 0; const A = { 원함: 0, 있음: 0, 첫등장: 0, 원하는초: 0, 초: 0, 최고: 0, 층: [] };
  for (const k of KEYS) A[k] = 0;
  for (const s of SEEDS) {
    let J;
    try { J = JSON.parse(fs.readFileSync(`tmp/slot_${a}_${s}.json`, "utf8")); } catch { continue; }
    const g = J["시간"] && J["시간"]["골렘"];
    if (!g || !g.초) continue;
    n++;
    A.원함 += g.원함합 / (g.초 / 0.05); A.있음 += g.있음합 / (g.초 / 0.05);
    A.첫등장 += g.첫등장 < 0 ? g.초 : g.첫등장;
    A.원하는초 += g.원하는초; A.초 += g.초;
    for (const k of KEYS) A[k] += g[k] || 0;
    const R = J.rows || [], f = R.length ? (R[R.length - 1]["최고층"] | 0) : 0;   // 최고층은 마지막 줄에 있다
    A.최고 += f; A.층.push(`${s}:${f}`);
  }
  if (!n) { console.log(`${a.padEnd(5)}│ 재지 못함`); continue; }
  acc[a] = { ...A, n };
  const 분모 = A.원하는초 || 1;
  console.log(`${a.padEnd(5)}│${(A.원함 / n).toFixed(1).padStart(5)} │${(A.있음 / n).toFixed(1).padStart(5)} │` +
    `${(Math.round(A.있음 / (A.원함 || 1) * 100) + "%").padStart(4)} │${(A.첫등장 / n).toFixed(0).padStart(7)} │` +
    `${(Math.round(A.첫등장 / n / 7.2) + "%").padStart(6)} │${String(A.최고).padStart(9)} │ ` +
    KEYS.map(k => (Math.round(A[k] / 분모 * 100) + "%").padStart(6)).join(" │ "));
}
console.log("");
for (const a of ARMS) if (acc[a]) console.log(`  ${a} 씨앗별 최고층 — ${acc[a].층.join(" · ")}`);
console.log("");
const o = acc.off, y = acc.on;
if (!o || !y) console.log("── 판정 ── 팔 둘을 다 못 읽었다.");
else {
  const 선퍼 = Math.round(y.있음 / (y.원함 || 1) * 100), 전퍼 = Math.round(o.있음 / (o.원함 || 1) * 100);
  const 첫퍼 = Math.round(y.첫등장 / y.n / 7.2);
  const 층차 = (y.최고 - o.최고) / (o.최고 || 1) * 100;
  console.log(`① 선 기수 ${전퍼}% → **${선퍼}%** (끝 조건 70%) ${선퍼 >= 70 ? "✅" : "❌"}`);
  console.log(`② 첫등장 판의 ${첫퍼}% (끝 조건 25%) ${첫퍼 <= 25 ? "✅" : "❌"} — 이건 나무가 정한다(팔이 못 바꿈)`);
  console.log(`③ 최고층 합 ${o.최고} → ${y.최고} (${층차 >= 0 ? "+" : ""}${층차.toFixed(1)}%) ` +
    (층차 <= -6 ? "❌ 깎였다 — 자리를 열고 못 채운 ㉡ 의 재판이다" : "✅ 안 깎였다"));
  const 분모 = y.원하는초 || 1;
  console.log(`④ 꽉참 ${Math.round(o.상한참 / (o.원하는초 || 1) * 100)}% → **${Math.round(y.상한참 / 분모 * 100)}%** ` +
    `(이 팔이 겨눈 통)`);
  console.log("→ 제일 큰 것 하나만 고친다. 값 다섯을 한꺼번에 만지면 무엇이 들었는지 못 본다.");
}
JS
echo "═════ 끝 · $(date +%H:%M) · 잰 커밋 $(git rev-parse --short HEAD) ═════"
