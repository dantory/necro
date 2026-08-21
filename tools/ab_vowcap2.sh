#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다 — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ D-8 이 찾아낸 자리를 실제로 민다 — «약속의 몫»(GATE_VOW_CAP) ══════════════
#   D-7 은 「체력이 얕아지니 주인이 덜 맞는다 = 물러나는 길이 있다」고 적었다. 틀렸다.
#   같은 열두 판에서 **맞은 횟수는 4368 로 한 톨도 안 변했는데**(25-49층) 피해만
#   315,735 → 171,634 로 반이 됐다. 물러난 것이 아니라 **같은 매가 절반 세기로 온 것**이다.
#   까닭은 GATE_VOW_CAP — 약속만 남은 수법 한 방을 «그때 내 최대체력의 18%»로 묶는다.
#   깊은 층 피해는 pool·curse·charge 가 **전부**(melee 0)이고 그 셋이 곧 약속이다.
#   곧 깊은 층의 위협은 층이 아니라 **내 몸의 몫**으로 매겨져 있다 — 몸을 깎으면
#   위협도 같이 깎이고, 몸을 키우면 위협도 같이 큰다. 그래서 어떤 몸을 만들어도
#   「한 방에 안 죽음」이 산수로 보장된다([[knob-that-does-nothing]] 의 사촌).
#
#   판정 (재기 전에 적는다 · 기준선 tmp/collapse_hpg2 = 지금 판):
#     ① 위험이 서는가 — 뒤 14분 죽음이 기준선(9)보다 늘고, 25층+ 죽음이 0 을 벗어난다.
#     ② 벽이 서면 안 된다 — 최고층 중앙이 기준선의 90% 미만이면 실패.
#        (씨앗이 달라도 같은 층에서 멈추면 확률이 아니라 산수 = 벽이다.)
#     ③ 앞 6분은 관찰만 — 상한은 얕은 층에도 걸리므로 움직일 수 있다. 늘면 값을 치른 것이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${MIN:-20}
SEEDS=${SEEDS:-"3 9 5 1 2 4"}
export MIN SEEDS
for cap in 0.24 0.30; do
  tag="vow$(echo "$cap" | tr -d '.')"
  out="tmp/collapse_${tag}"; mkdir -p "$out"
  for doc in balance flesh; do
    for seed in $SEEDS; do
      f="$out/${doc}_${seed}.json"
      [ -s "$f" ] && continue
      LH_SEED=$seed LH_DOC=$doc LH_VOWCAP=$cap node tools/loop_health.mjs "$MIN" "$f" > "$out/${doc}_${seed}.log" 2>&1
      echo "== cap$cap $doc seed$seed 끝 · $(date +%H:%M:%S) ==" >&2
    done
  done
done
node - <<'JS'
const fs = require("fs");
const arms = [["tmp/collapse_hpg2","기준선 0.18"],["tmp/collapse_vow024","0.24"],["tmp/collapse_vow030","0.30"]];
const docs = ["balance","flesh"], seeds = (process.env.SEEDS||"3 9 5 1 2 4").split(/\s+/).filter(Boolean);
const med = v => { if(!v.length) return null; const s=[...v].sort((a,b)=>a-b); return s[s.length>>1]; };
console.log(`\n══ D-8 · 약속의 몫(GATE_VOW_CAP)을 민다 — ${process.env.MIN||20}분 × 씨앗 ${seeds.length} × 편성 2 ══\n`);
console.log("| 팔 | 죽음 | 앞6분 | 뒤14분 | 25층+ 죽음 | 최고층 중앙 | 최고층들 | 25-49 절반아래 | 50-99 절반아래 | 깊은띠 초당 |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const [dir,name] of arms) {
  let dth=0, 앞=0, 뒤=0, 깊죽=0; const tops=[]; const band={};
  for (const d of docs) for (const s of seeds) {
    const f=`${dir}/${d}_${s}.json`; if(!fs.existsSync(f)) continue;
    const j=JSON.parse(fs.readFileSync(f,"utf8"));
    for (const e of j.deaths||[]) { dth++; if ((e.분|0)<=6) 앞++; else 뒤++; if ((e.층|0)>=25) 깊죽++; }
    tops.push(Math.max(...j.rows.map(r=>r.최고층|0)));
    for (const [b,Z] of Object.entries(j.시간.위험.띠||{})) {
      const o=band[b]||(band[b]={초:0,피해율:0,절반아래:0}); o.초+=Z.초; o.피해율+=Z.피해율; o.절반아래+=Z.절반아래||0; }
  }
  if (!tops.length) { console.log(`| ${name} | (없음) |`); continue; }
  const deep = ["25-49","50-99"].reduce((a,b)=>({초:a.초+(band[b]?.초||0), 율:a.율+(band[b]?.피해율||0)}),{초:0,율:0});
  console.log(`| ${name} | ${dth} | ${앞} | ${뒤} | ${깊죽} | ${med(tops)} | ${tops.join("·")} `
    + `| ${(band["25-49"]?.절반아래||0).toFixed(0)}초 | ${(band["50-99"]?.절반아래||0).toFixed(0)}초 `
    + `| ${(deep.초?deep.율/deep.초*100:0).toFixed(2)}% |`);
}
console.log("\n판정: ① 뒤14분 죽음 > 9 이고 25층+ 죽음 > 0 · ② 최고층 중앙이 기준선의 90% 이상 · ③ 앞6분은 관찰만\n");
JS
