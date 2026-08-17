#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **골렘이 왜 판에 안 서나** (ROADMAP E 「편성 넷이 실제로 갈리는지」가 남긴 마지막 물음).
#   종 비율은 확실히 갈린다(해골 52.7~82.1%). 그런데 **골렘만 어느 편성에서도 2.9~6.6%** 다 —
#   「골렘 벽」이라고 이름 붙인 편성에서조차 6% 다. 그러니 최고층이 안 갈리는 진짜 까닭이
#   「종끼리 실력 차가 없다」가 아니라 **셋 중 하나가 판에 아예 안 서기 때문**일 수 있다.
#
#   ★ 값을 만지기 **전에** 무엇이 막는지부터 잰다([[cause-written-in-the-item-is-a-guess]]).
#   loop_health 에 붙인 「골렘」 통이 답한다 — 편성이 골렘을 **더 원한 초**만 분모로 삼아
#   그 초를 미해금·꽉참·재사용·마나부족·시체없음 중 무엇이 막았는지 센다.
#
#   편성 둘만 본다: wall(제일 많이 원함 · cap 26 이면 5기) · bone(제일 적게 원함 · 1~2기).
#   씨앗 3·9·5 · 12분. 재는 것은 「갈리나」가 아니라 「무엇이 막나」라 씨앗 셋으로 족하다.
#
#   보는 법 —
#     · **미해금**이 크다 → 나무(Lv.16 legion→golem)가 늦다. 값이 아니라 **해금 시각**이 벽.
#     · **꽉참**이 크다 → 해골이 자리를 먼저 다 차지한다. auto() 의 채우는 차례 문제.
#     · **마나부족**이 크다 → mp 30 이 너무 비싸다(해골 6 의 다섯 배).
#     · **셀차례**가 크다 → 아무것도 안 막았는데 안 섰다 = auto() 가 안 부른 것이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
DOCS=${DOCS:-"wall bone"}
SEEDS=${SEEDS:-"3 9 5"}

node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ 골렘이 왜 안 서나 · 편성 [$DOCS] × 씨앗 [$SEEDS] × 12분 · $(date +%H:%M) ═════"
for d in $DOCS; do
  for s in $SEEDS; do
    echo "───────── DOC $d · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s LH_DOC=$d node tools/loop_health.mjs 12 "$OUT/golem_${d}_$s.json" 2>&1 \
      | grep -E '^골렘|더 원한|골렘을 막는|최고|errors' | head -6
  done
done

echo ""
echo "═════ 판정 ═════"
DOCS="$DOCS" SEEDS="$SEEDS" node - <<'JS'
import fs from "node:fs";
const DOCS = (process.env.DOCS || "wall bone").trim().split(/\s+/);
const SEEDS = (process.env.SEEDS || "3 9 5").trim().split(/\s+/).map(Number);
const NM = { balance: "균형", bone: "해골위주", flesh: "구울위주", wall: "골렘벽" };
const KEYS = ["미해금", "상한참", "재사용", "마나부족", "시체없음", "셀차례"];
const HD = { 미해금: "미해금", 상한참: "꽉참", 재사용: "재사용", 마나부족: "마나", 시체없음: "시체", 셀차례: "셀차례" };
console.log(" 편성 │ 원함 │ 선것 │ 최대 │ 해금 │ 첫등장 │ 더원한% │ " + KEYS.map(k => HD[k].padStart(6)).join(" │ "));
const acc = {};
for (const d of DOCS) {
  let n = 0; const A = { 원함: 0, 있음: 0, 최대: 0, 해금: 0, 첫등장: 0, 원하는초: 0, 초: 0 };
  for (const k of KEYS) A[k] = 0;
  for (const s of SEEDS) {
    let g;
    try { g = JSON.parse(fs.readFileSync(`tmp/golem_${d}_${s}.json`, "utf8"))["시간"]["골렘"]; } catch { continue; }
    if (!g || !g.초) continue;
    n++;
    A.원함 += g.원함합 / (g.초 / 0.05); A.있음 += g.있음합 / (g.초 / 0.05);
    A.최대 = Math.max(A.최대, g.최대); A.해금 += g.해금 < 0 ? g.초 : g.해금;
    A.첫등장 += g.첫등장 < 0 ? g.초 : g.첫등장;
    A.원하는초 += g.원하는초; A.초 += g.초;
    for (const k of KEYS) A[k] += g[k] || 0;
  }
  if (!n) { console.log(`${(NM[d] || d).padEnd(6)}│ 재지 못함`); continue; }
  acc[d] = { ...A, n };
  const 분모 = A.원하는초 || 1;
  console.log(`${(NM[d] || d).padEnd(6)}│${(A.원함 / n).toFixed(1).padStart(5)} │${(A.있음 / n).toFixed(1).padStart(5)} │` +
    `${String(A.최대).padStart(5)} │${(A.해금 / n).toFixed(0).padStart(5)} │${(A.첫등장 / n).toFixed(0).padStart(7)} │` +
    `${Math.round(A.원하는초 / A.초 * 100).toString().padStart(8)} │ ` +
    KEYS.map(k => (Math.round(A[k] / 분모 * 100) + "%").padStart(6)).join(" │ "));
}
console.log("");
const w = acc.wall;
if (!w) console.log("── 판정 ── wall 을 못 읽었다.");
else {
  const 분모 = w.원하는초 || 1;
  const 큰 = KEYS.filter(k => k !== "셀차례").map(k => [k, w[k] / 분모]).sort((a, b) => b[1] - a[1])[0];
  console.log(`① 「골렘 벽」이 원한 ${(w.원함 / w.n).toFixed(1)}기 중 실제로 선 것은 **${(w.있음 / w.n).toFixed(1)}기** ` +
    `(${Math.round(w.있음 / (w.원함 || 1) * 100)}%)`);
  console.log(`② 그 부족을 막은 제일 큰 것은 **${큰[0]}** ${Math.round(큰[1] * 100)}%`);
  console.log(`③ 해금 평균 ${(w.해금 / w.n).toFixed(0)}초 / 첫등장 ${(w.첫등장 / w.n).toFixed(0)}초 ` +
    `— 12분(720초) 판의 ${Math.round(w.첫등장 / w.n / 7.2)}% 를 **골렘 없이** 산다`);
  console.log(`④ 아무것도 안 막았는데 안 선 초(셀차례) ${Math.round(w.셀차례 / 분모 * 100)}% ` +
    (w.셀차례 / 분모 > 0.2 ? "★ auto() 가 부를 차례를 못 얻는다 — 코드 쪽 문제다" : "— auto() 는 부르고 있다"));
  console.log("→ 제일 큰 것 하나만 고친다. 값 다섯을 한꺼번에 만지면 무엇이 들었는지 못 본다.");
}
JS
echo "═════ 끝 · $(date +%H:%M) · 잰 커밋 $(git rev-parse --short HEAD) ═════"
