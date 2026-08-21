#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **새 강화 규칙(C-㉠-①)이 판에서 실제로 갈리는가** (병수님 2026-08-21 17:40 「①」).
#   `forge_mix.mjs` 는 **식**을 두드려 「계급이 갈린다」까지만 말한다. 계급이 갈려도
#   판이 안 갈리면 그건 산수지 판이 아니다 — 그래서 20분 판을 편성 넷으로 굴린다.
#
#   끝 조건 (값을 고르기 전에 적는다):
#     ① 편성별 **최고층**이 15% 이상 갈릴 것 — 몸이 갈렸으면 성적도 갈려야 한다
#     ② 어느 편성도 **죽음이 균형보다 1.5배 넘게 늘지 않을 것**
#        ★ 마나 몫을 낮춘 편성(구울 0.9)이 앞 6분의 죽음을 늘릴 수 있다.
#          08-21 실측: 죽음 일곱이 **전부 마나 0~6**. 여기가 이 바꿈의 제일 큰 위험이다.
#     ③ **균형은 예전과 같을 것** — 지난 A/B 의 축이라, 흔들리면 옛 측정을 못 읽는다
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=/tmp/forgemix; mkdir -p "$OUT"
SECS=${SECS:-1200}
for doc in balance bone flesh wall; do
  for seed in 3 9 5; do
    f="$OUT/${doc}_${seed}.json"
    [ -s "$f" ] && continue
    LH_SEED=$seed LH_DOC=$doc node tools/loop_health.mjs "$SECS" > "$f" 2>"$OUT/${doc}_${seed}.err"
    echo "== $doc seed$seed 끝 ==" >&2
  done
done
node - <<'JS'
const fs = require("fs");
const docs = ["balance","bone","flesh","wall"], seeds = [3,9,5];
const N = { balance:"균형", bone:"해골", flesh:"구울", wall:"골렘벽" };
const row = {};
for (const d of docs) {
  const rs = [];
  for (const s of seeds) {
    const p = `/tmp/forgemix/${d}_${s}.json`;
    if (!fs.existsSync(p)) continue;
    try { rs.push(JSON.parse(fs.readFileSync(p, "utf8"))); } catch {}
  }
  if (!rs.length) continue;
  const g = (f) => rs.map(f).reduce((a,b)=>a+b,0) / rs.length;
  row[d] = { 최고층: +g(r => r.deepest ?? r.floor ?? 0).toFixed(1),
             죽음:   +g(r => r.deaths ?? 0).toFixed(2),
             레벨:   +g(r => r.lv ?? 0).toFixed(1),
             판수:   rs.length };
}
console.log("편성   | 최고층  죽음  레벨  판");
for (const d of docs) if (row[d])
  console.log(`${N[d].padEnd(6)} | ${String(row[d].최고층).padStart(6)} ${String(row[d].죽음).padStart(5)} ${String(row[d].레벨).padStart(5)} ${String(row[d].판수).padStart(3)}`);
const fl = [];
const fs2 = docs.filter(d => row[d]).map(d => row[d].최고층);
if (fs2.length >= 2) {
  const sp = Math.max(...fs2) / Math.max(1e-9, Math.min(...fs2)) - 1;
  console.log(`\n① 최고층 폭 ${(sp*100).toFixed(1)}%  (끝 조건 15% 이상)`);
  if (sp < 0.15) fl.push(`① 편성별 최고층이 ${(sp*100).toFixed(1)}% 밖에 안 갈린다 — 몸은 갈렸는데 판이 안 갈린다`);
}
if (row.balance) for (const d of docs) {
  if (d === "balance" || !row[d]) continue;
  if (row[d].죽음 > row.balance.죽음 * 1.5 + 0.3)
    fl.push(`② ${N[d]}: 죽음 ${row[d].죽음} 이 균형(${row.balance.죽음})의 1.5배 초과 — 마나를 굶겼을 수 있다`);
}
console.log("\n" + (fl.length ? "미달\n  · " + fl.join("\n  · ") : "통과"));
JS
