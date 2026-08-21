#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **H-2 — 몸의 여유가 «스물다섯 대»다.** 1층 맨몸 100 이 층피해 4 를 이겨서, 설계값
#   「다섯 대」에는 12층쯤 가야 닿는다. D2 의 Lv.1 네크로는 여덟~아홉 대다.
#   `__EARLY_HITS` = 초반에만 걸리는 천장(`floorDmg × 그 수`). 층을 따라 자라서
#   바닥과 만나면 스스로 사라진다 — 9 면 1~8층에만 걸린다(9층부터 옛 값 그대로).
#
#   판정 (재기 전에 적는다):
#     ① 45초 「버틸대수」가 **9 안팎**으로 내려올 것            (지금 25)
#     ② 3분 「최저체력비」가 **0.5 밑**으로 내려올 것            (지금 0.93 · H-1 뒤 0.51)
#     ③ 그런데 3분 「죽음」이 **1 을 넘으면 안 된다** — 넘으면 위험이 아니라 «멎음»이다
#        (H-1 에서 상한 3 이 그랬다: 마나마름 50% · 3분에 3.7층)
#     ④ 3분 「층」이 옛 팔의 **60% 밑으로 떨어지면** 너무 깎은 것이다
#   ★ 같은 자·같은 씨앗으로 네 팔([[seed-the-probe]]) · 0 은 되돌린 팔이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp/early; mkdir -p "$OUT"
MIN=${MIN:-3}
SEEDS=${SEEDS:-"1,3,7"}
ARMS=${ARMS:-"0 12 9 7"}
node tools/chrome_guard.mjs >> "$OUT/guard.log" 2>&1 || true
for eh in $ARMS; do
  f="$OUT/eh${eh}.txt"
  [ -s "$f" ] && continue
  NECRO_KNOBS="__EARLY_HITS=$eh" node tools/start_probe.mjs "$MIN" "$SEEDS" > "$f" 2>&1
  echo "== EARLY_HITS=$eh 끝 · $(date +%H:%M:%S) ==" >&2
done
ARMS="$ARMS" node - <<'JS'
const fs = require("fs");
const arms = (process.env.ARMS || "0 12 9 7").split(/\s+/).filter(Boolean);
const pick = (txt, sec) => {
  for (const ln of txt.split("\n")) {
    const t = ln.trim().split(/\s+/);
    if (t.length < 14 || !/^\d+$/.test(t[0])) continue;
    if (+t[0] !== sec) continue;
    return { 층:+t[1], lv:+t[2], 군세:t[3], 체력:+t[4], 버틸대수:+t[5], 최저:+t[6],
             맞은수:+t[7], 받은피해:+t[8], 처치:+t[9], 마나마름:+t[11], 자리참:+t[12], 죽음:+t[13] };
  }
  return null;
};
console.log(`\n══ H-2 — 초반에만 걸리는 천장 (3분 × 씨앗 1·3·7 · 네 팔) ══\n`);
console.log("| 천장(대) | 45초 버틸대수 | 45초 맞은수 | 45초 체력 | 3분 최저체력비 | 3분 맞은수 | 3분 죽음 | 3분 층 | 마나마름% |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
const rows = [];
for (const a of arms) {
  const f = `tmp/early/eh${a}.txt`;
  if (!fs.existsSync(f)) { console.log(`| ${a} | (아직 없음) | | | | | | | |`); continue; }
  const txt = fs.readFileSync(f, "utf8");
  const e = pick(txt, 45), l = pick(txt, 180);
  if (!e || !l) { console.log(`| ${a} | (표 못 읽음) | | | | | | | |`); continue; }
  rows.push({ a, e, l });
  console.log(`| ${a === "0" ? "없음(옛)" : a} | ${e.버틸대수} | ${e.맞은수} | ${e.체력} | ${l.최저} | ${l.맞은수} | ${l.죽음} | ${l.층} | ${l.마나마름} |`);
}
const base = rows.find(r => r.a === "0");
console.log("");
for (const r of rows) {
  if (r.a === "0") continue;
  const 층비 = base ? r.l.층 / base.l.층 : NaN;
  const ok = [r.e.버틸대수 <= 12, r.l.최저 < 0.5, r.l.죽음 <= 1, !(층비 < 0.6)];
  console.log(`천장 ${r.a}대 — ①버틸대수 ${r.e.버틸대수} ${ok[0]?"○":"✗"} · ②최저 ${r.l.최저} ${ok[1]?"○":"✗"}`
    + ` · ③죽음 ${r.l.죽음} ${ok[2]?"○":"✗"} · ④층 ${r.l.층} (옛의 ${(층비*100).toFixed(0)}%) ${ok[3]?"○":"✗"}`
    + `  → ${ok.every(Boolean) ? "**통과**" : "미달"}`);
}
JS
