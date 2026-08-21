/* 「뒤 4분의 3 에 왜 위험이 없느냐」 — ROADMAP 「D. 난이도」가 다음에 잴 자리다.
   20분 판에서 죽음은 **전부 앞 6분(층 3~12)** 에 나고, 그 뒤 14~16분 동안 층은
   71~80 까지 가는데 죽음이 0 이다(2026-08-21 · ab_hpgrow 씨앗 1·3·7·9).
   그러니 물음은 「죽음이 몇 번이냐」가 아니라 **「어느 층부터 내 쪽이 영영 앞서느냐」** 다.

   ★ **공격 쪽은 식으로 재면 안 된다.** 처음엔 `armyCap × minionDmgMul` 을 화력으로 놓고
     「층 지우는 시간」을 계산했는데 40층이 **2,170초**로 나왔다 — 실제로는 **11.6초**다.
     식에는 하수인의 실제 때림·되살림·수법이 하나도 안 들어간다([[probe-must-walk-the-real-path]]).
     그래서 공격 쪽과 죽음은 **실측 산출물**(`tmp/hpg_new_*.json` · 20분 × 씨앗 1·3·7·9)에서
     읽고, 식으로 재는 것은 순수히 식으로 정해지는 «버티는 대수» 하나만 남긴다.

   재는 것 셋:
     ㉠ 버티는 대수 = hpMaxOf() / floorDmg(층)  — 식 (그 층의 한 대를 몇 번 맞고 사는가)
     ㉡ 층에 머문 시간                          — 실측 (깊이를 따라 늘어나는가)
     ㉢ 죽는 순간의 사진                        — 실측 (무엇이 모자라서 죽는가) */
import { readFileSync, existsSync } from "node:fs";
const C = await import("../js/core.js");

/* ══ ㉠ 버티는 대수 ══ 층→레벨은 실측 궤적(씨앗 1 · 14층 Lv.11 · 40층 Lv.43 · 75층 Lv.98). */
const TRAJ = [[1, 1], [14, 11], [40, 43], [75, 98]];
const lvAt = (f) => {
  for (let i = 1; i < TRAJ.length; i++) {
    const [f0, l0] = TRAJ[i - 1], [f1, l1] = TRAJ[i];
    if (f <= f1) return Math.round(l0 + (l1 - l0) * (f - f0) / (f1 - f0));
  }
  const [f0, l0] = TRAJ.at(-2), [f1, l1] = TRAJ.at(-1);
  return Math.round(l1 + (l1 - l0) / (f1 - f0) * (f - f1));
};
const setUp = (r) => { for (const k of Object.keys(C.UPS)) C.META.up[k] = r; };
for (const k of Object.keys(C.META.plus || {})) C.META.plus[k] = 0;   // 재련은 끈다 — 맨 식을 본다
const hitsAt = (f, rank) => {
  C.S.floor = f; C.META.deepest = f; C.META.lv = lvAt(f); setUp(rank);
  return C.hpMaxOf() / C.floorDmg(f);
};

console.log("══ ㉠ 버티는 대수 = 내 체력 / 층피해 ══  (식 · 층→레벨은 실측 궤적)");
console.log("     층 │" + [0, 20, 40].map((r) => `  계급 ${String(r).padStart(2)}`).join(" │"));
for (const f of [1, 5, 10, 14, 18, 20, 30, 40, 60, 80]) {
  console.log(`   ${String(f).padStart(4)} │`
    + [0, 20, 40].map((r) => hitsAt(f, r).toFixed(2).padStart(9)).join(" │"));
}
for (const rank of [0, 20, 40]) {
  let last = null, turn = null;
  for (let f = 1; f <= 200; f++) {
    const h = hitsAt(f, rank);
    if (last != null && h < last - 1e-9) turn = null; else if (turn == null) turn = f;
    last = h;
  }
  console.log(`   계급 ${String(rank).padStart(2)} → 다시는 안 줄어드는 첫 층 = `
    + (turn ? `**${turn}층**` : "**없다(200층까지 계속 준다)**"));
}
/* 계급 0 만 «평평»해지는 까닭: hpMaxOf 의 배수 hpGrow = bodyHp/bodyBase 인데
   bodyBase 가 레벨을 따라 자라므로(100 + (Lv-1)×8) 강화가 쌓은 **고정 몫이 묽어진다.**
   판에서는 계급도 같이 오르므로 이 묽어짐이 얼마나 상쇄되는지는 ㉡·㉢ 이 답한다. */
let cross = null;
for (let f = 1; f <= 200; f++) { setUp(0); C.META.lv = lvAt(f);
  if (C.floorDmg(f) * C.SURVIVE_HITS >= 100 + (C.META.lv - 1) * 8) { cross = f; break; } }
console.log(`   ☞ 맨몸에서 «층피해×${C.SURVIVE_HITS}» 가 몸을 이기는 자리 = **${cross}층** —`
  + ` 그 전까지는 체력이 평평한데 층피해만 1.155^층 으로 자란다.`);

/* ══ ㉡·㉢ 실측 ══ */
const SEEDS = [1, 3, 7, 9];
const runs = SEEDS.map((s) => `tmp/hpg_new_${s}.json`)
  .filter(existsSync).map((p) => JSON.parse(readFileSync(p, "utf8")));
if (!runs.length) { console.log("\n⚠ tmp/hpg_new_*.json 이 없다 — tools/ab_hpgrow.sh 를 먼저 돌린다."); process.exit(0); }

console.log(`\n══ ㉡ 층에 머문 시간 ══ (실측 · 씨앗 ${SEEDS.join("·")} · 20분 · 「싸움」 초)`);
const band = [[1, 5], [6, 10], [11, 20], [21, 40], [41, 60], [61, 80]];
for (const [a, b] of band) {
  const v = [];
  for (const r of runs) for (const [f, o] of Object.entries(r.시간.byF))
    if (+f >= a && +f <= b) v.push(o.싸움 / Math.max(1, o.든횟수 | 0));
  if (!v.length) continue;
  v.sort((x, y) => x - y);
  console.log(`   ${String(a).padStart(3)}~${String(b).padStart(3)}층 │ 층당 싸움 `
    + `${v[v.length >> 1].toFixed(1).padStart(6)}초 (중앙값 · 표본 ${v.length})`);
}
console.log("   ☞ 깊이를 따라 늘어나지 않으면 «적이 세져서 못 민다»가 아니다 — 판은 계속 굴러간다.");

console.log("\n══ ㉢ 죽는 순간의 사진 ══ (실측 · 죽음 하나가 한 줄)");
console.log("   씨앗  분  층 │ 군세/상한  마나/최대  시체 │ 버틴 대수");
let cnt = 0, lastMin = 0;
runs.forEach((r, i) => (r.deaths || []).forEach((d) => {
  cnt++; lastMin = Math.max(lastMin, d.분 | 0);
  console.log(`   ${String(SEEDS[i]).padStart(4)} ${String(d.분).padStart(3)} ${String(d.층).padStart(3)} │`
    + `${String(d.군세).padStart(6)}/${String(d.상한).padEnd(3)}`
    + `${String(Math.round(d.마나)).padStart(6)}/${String(Math.round(d.마나최대)).padEnd(5)}`
    + `${String(d.시체).padStart(5)} │ ${(d.최대체력 / d.층피해).toFixed(1).padStart(6)}`);
}));
const all = runs.flatMap((r) => r.deaths || []);
const med = (xs) => { const v = [...xs].sort((a, b) => a - b); return v[v.length >> 1]; };
console.log(`\n   죽음 ${cnt} 개 · 전부 **${Math.min(...all.map((d) => d.분))}~${lastMin}분 · 층 `
  + `${Math.min(...all.map((d) => d.층))}~${Math.max(...all.map((d) => d.층))}**`);
console.log(`   죽는 순간 중앙값: 군세 **${med(all.map((d) => d.군세))}**/${med(all.map((d) => d.상한))} · `
  + `마나 **${med(all.map((d) => Math.round(d.마나)))}**/${med(all.map((d) => Math.round(d.마나최대)))} · `
  + `시체 **${med(all.map((d) => d.시체))}** · 버틴 대수 ${med(all.map((d) => d.최대체력 / d.층피해)).toFixed(1)}`);
console.log("   ☞ 시체는 넉넉한데 군세가 0~3 이고 마나가 바닥이면, 죽인 것은 «층의 세기»가 아니라\n"
  + "     **군대가 무너진 뒤 다시 못 세우는 것**이다 — 층을 세게 만들어도 뒤쪽엔 안 닿는다.");
C.S.floor = 1; setUp(0);
process.exit(0);
