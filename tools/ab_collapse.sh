#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **D — 뒤 4분의 3 에 왜 위험이 없는가.** 08-21 실측: 죽음은 전부 앞 6분.
#   여태의 「위기」는 **체력과 군세를 한 통에** 담아서, 뒤쪽이 조용한 까닭이
#     ㉠ 군대가 **아예 안 무너져서**인지  ㉡ 무너져도 **즉시 다시 서서**인지를 못 가른다.
#   ㉠ 이면 고칠 자리는 **위협 쪽**, ㉡ 이면 **복구 쪽**이다 — 정반대다.
#   loop_health 의 새 통(붕괴.군세/붕괴.체력 · 복구초)으로 그것만 가른다.
#
#   판정 (재기 전에 적는다):
#     ㉠ 뒤 14분의 **분당 반토막**이 앞 6분의 **1/4 미만**이면 → 「안 무너진다」
#     ㉡ 뒤에서도 무너지는데 **복구초 중앙값이 앞보다 짧으면**  → 「즉시 다시 선다」
#   ★ 자는 **읽기만 한다** — 씨앗 3·balance 는 tmp/forgemix/balance_3.json 과
#     바이트까지 같음을 확인했다(2026-08-21 18:4x). 곧 옛 판과 그대로 견줄 수 있다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp/collapse; mkdir -p "$OUT"
MIN=${MIN:-20}
# 씨앗 목록은 ab_doc/ab_forgemix 와 **같다** — 두 자를 맞대려면 같은 판이어야 한다.
SEEDS=${SEEDS:-"3 9 5 1 2 4"}
for doc in balance flesh; do
  for seed in $SEEDS; do
    f="$OUT/${doc}_${seed}.json"
    [ -s "$f" ] && continue
    LH_SEED=$seed LH_DOC=$doc node tools/loop_health.mjs "$MIN" "$f" > "$OUT/${doc}_${seed}.log" 2>&1
    echo "== $doc seed$seed 끝 · $(date +%H:%M:%S) ==" >&2
  done
done
node - <<'JS'
const fs = require("fs");
const docs = ["balance","flesh"], N = { balance:"균형", flesh:"구울" };
const seeds = (process.env.SEEDS || "3 9 5 1 2 4").split(/\s+/).filter(Boolean);
const MIN = +(process.env.MIN || 20), 뒤분 = MIN - 6;
const med = (v) => { if (!v.length) return null; const s=[...v].sort((a,b)=>a-b); return s[s.length>>1]; };
console.log(`\n══ D — 군대가 무너지는 사건은 «언제» 나는가 (${MIN}분 × 씨앗 ${seeds.length} × 편성 ${docs.length}) ══\n`);
console.log("| 편성 | 반토막 앞/분 | 반토막 뒤/분 | 뒤÷앞 | 체력위기 앞/분 | 체력위기 뒤/분 | 복구초 앞 | 복구초 뒤 |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
const all = { 앞A:0, 뒤A:0, 앞H:0, 뒤H:0, n:0, 앞복:[], 뒤복:[], 뒤사진:[] };
for (const d of docs) {
  let 앞A=0, 뒤A=0, 앞H=0, 뒤H=0, n=0; const 앞복=[], 뒤복=[];
  for (const s of seeds) {
    const f = `tmp/collapse/${d}_${s}.json`;
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f,"utf8"));
    const A = (j.붕괴&&j.붕괴.군세)||[], H = (j.붕괴&&j.붕괴.체력)||[];
    n++;
    앞A += A.filter(e=>e.분<=6).length; 뒤A += A.filter(e=>e.분>6).length;
    앞H += H.filter(e=>e.분<=6).length; 뒤H += H.filter(e=>e.분>6).length;
    for (const e of A) { if (typeof e.복구초!=="number") continue;
      (e.분<=6?앞복:뒤복).push(e.복구초); }
    for (const e of A) if (e.분>6) all.뒤사진.push(e);
  }
  if (!n) continue;
  const a=(x,m)=>(x/n/m).toFixed(2);
  const 비 = 앞A ? (뒤A/뒤분)/(앞A/6) : NaN;
  console.log(`| ${N[d]} | ${a(앞A,6)} | ${a(뒤A,뒤분)} | **${(비*100).toFixed(0)}%** | ${a(앞H,6)} | ${a(뒤H,뒤분)} `
    + `| ${med(앞복)!=null?med(앞복).toFixed(1)+"초 (n="+앞복.length+")":"표본 0"} `
    + `| ${med(뒤복)!=null?med(뒤복).toFixed(1)+"초 (n="+뒤복.length+")":"표본 0"} |`);
  all.앞A+=앞A; all.뒤A+=뒤A; all.앞H+=앞H; all.뒤H+=뒤H; all.n+=n;
  all.앞복.push(...앞복); all.뒤복.push(...뒤복);
}
const 비 = all.앞A ? (all.뒤A/뒤분)/(all.앞A/6) : NaN;
console.log(`\n합계 ${all.n}판 — 반토막 앞 ${all.앞A}회 · 뒤 ${all.뒤A}회 · 뒤÷앞 **${(비*100).toFixed(0)}%** (판정선 25%)`);
console.log(`         체력위기 앞 ${all.앞H}회 · 뒤 ${all.뒤H}회`);
console.log(비 < 0.25
  ? `\n☞ **㉠ 이다 — 뒤에서는 군대가 아예 안 무너진다.** 고칠 자리는 **복구 쪽이 아니라 위협 쪽**이다.\n`
  + `   (복구를 아무리 느리게 해도 «무너짐» 자체가 없으니 닿지 않는다.)`
  : `\n☞ **㉡ 쪽이다 — 뒤에서도 무너진다.** 복구초를 견줄 것: 앞 ${med(all.앞복)} 대 뒤 ${med(all.뒤복)}.`);
if (all.뒤사진.length) {
  const md=(k)=>med(all.뒤사진.map(e=>e[k]));
  console.log(`   뒤쪽 무너짐의 사진(중앙값) — 마나 ${md("마나")}/${md("마나최대")} · 시체 ${md("시체")} · 체력율 ${md("체력율")} · 층 ${md("층")} · 봉우리 ${md("봉우리")}`);
}
JS
