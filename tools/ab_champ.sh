#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ D-2 · 우두머리 무리 — **뒤 4분의 3 에 «군대가 무너지는 사건»이 서는가** ═════════
#
#   실측(2026-08-21): 20분 판에서 군세 반토막이 **앞 6분 17번 · 뒤 14분 0번**.
#   소환수를 실제로 깎는 수법은 관문 주인의 저주 하나뿐인데 그 주인은 20층마다 한 번 서고,
#   깊은 관문의 주인은 한 번에 1.0초를 산다. 곧 뒤쪽에는 **쓸어낼 것이 아예 없다.**
#   평지에 우두머리(champion)를 세우고 **절규**로 소환수를 깎는다(`__CHAMP`).
#
#   판정 (재기 **전에** 적는다 · 양쪽으로 열어 둔다):
#     ㉠ 뒤 14분의 **분당 반토막**이 앞 6분의 **25% 이상**       (지금 0%)
#     ㉡ **죽음**이 끈 팔의 **1.5배**를 안 넘는다                (마나를 굶기면 앞 6분이 터진다)
#     ㉢ **최고층**이 끈 팔의 **90% 아래로 안 떨어진다**          (벽이 되면 판이 짧아진다)
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp/champ; mkdir -p "$OUT"
MIN=${MIN:-20}
SEEDS=${SEEDS:-"1 3 7 9"}
HOWL=${HOWL:-}
node tools/chrome_guard.mjs || echo "(chrome_guard 실패 — 그대로 간다)"
for arm in 0 1; do
  for seed in $SEEDS; do
    f="$OUT/a${arm}_${seed}.json"
    [ -s "$f" ] && continue
    LH_SEED=$seed LH_CHAMP=$arm ${HOWL:+LH_CHAMPHOWL=$HOWL} \
      node tools/loop_health.mjs "$MIN" "$f" > "$OUT/a${arm}_${seed}.log" 2>&1
    echo "== 팔$arm 씨앗$seed 끝 · $(date +%H:%M:%S) ==" >&2
  done
done
MIN=$MIN SEEDS="$SEEDS" node - <<'JS'
const fs = require("fs");
const seeds = (process.env.SEEDS || "1 3 7 9").split(/\s+/).filter(Boolean);
const MIN = +(process.env.MIN || 20), 뒤분 = MIN - 6;
const arm = (a) => {
  let 앞=0, 뒤=0, n=0, 죽음=0, 최고=0, 레벨=0, 절규=0;
  for (const s of seeds) {
    const f = `tmp/champ/a${a}_${s}.json`; if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    n++; 죽음 += (j.deaths || []).length;
    const last = j.rows[j.rows.length - 1];
    최고 += last.최고층 || last.층; 레벨 += last.레벨;
    for (const r of (j.붕괴 && j.붕괴.군세) || []) (r.초 != null ? r.초 : r.t) < 360 ? 앞++ : 뒤++;
    /* 절규는 로그에서 센다 — json 엔 안 담긴다(자를 안 바꾸려고 읽기만 한다). */
    const lg = `tmp/champ/a${a}_${s}.log`;
    if (fs.existsSync(lg)) for (const m of fs.readFileSync(lg, "utf8").matchAll(/절규 \*\*(\d+)번/g)) 절규 += +m[1];
  }
  return { n, 죽음: 죽음/n, 최고: 최고/n, 레벨: 레벨/n, 앞분: 앞/n/6, 뒤분: 뒤/n/뒤분, 절규: 절규/n };
};
const A = arm(0), B = arm(1);
const p = (x) => x.toFixed(2);
console.log(`\n══ D-2 · 우두머리 무리 (${MIN}분 × 씨앗 ${seeds.length}) ══\n`);
console.log("| 팔 | 반토막 앞/분 | 반토막 뒤/분 | 뒤÷앞 | 죽음 | 최고층 | 레벨 | 절규/판 |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
for (const [n, x] of [["끔(지금)", A], ["켬", B]])
  console.log(`| ${n} | ${p(x.앞분)} | ${p(x.뒤분)} | **${x.앞분 ? (x.뒤분/x.앞분*100).toFixed(0) : "–"}%** | ${p(x.죽음)} | ${p(x.최고)} | ${p(x.레벨)} | ${x.절규.toFixed(0)} |`);
const c1 = B.앞분 ? B.뒤분 / B.앞분 >= 0.25 : false;
const c2 = B.죽음 <= A.죽음 * 1.5;
const c3 = B.최고 >= A.최고 * 0.90;
console.log(`\n㉠ 뒤÷앞 ≥ 25% — ${c1 ? "통과" : "실패"} (${(B.뒤분/B.앞분*100).toFixed(0)}%)`);
console.log(`㉡ 죽음 ≤ 끈 팔 ×1.5 — ${c2 ? "통과" : "실패"} (${p(B.죽음)} vs ${p(A.죽음*1.5)})`);
console.log(`㉢ 최고층 ≥ 끈 팔 ×0.90 — ${c3 ? "통과" : "실패"} (${p(B.최고)} vs ${p(A.최고*0.90)})`);
console.log(`\n☞ ${c1&&c2&&c3 ? "셋 다 통과 — 켠다." : "미달 — 값이 아니라 어디가 막혔는지부터 본다."}`);
JS
