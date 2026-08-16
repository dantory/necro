/* **시체가 상한에 얼마나 오래 붙어 있나** — 2단계 ⑥ 의 판정자.
   간판이 「시체가 자원」인데 쓰는 곳이 소환·폭발뿐이라 깊은 층에서 상한(140)에 붙박였다.
   소비처 셋(burn·wall·offer)을 넣어 **포화 시간 비율**을 절반 아래로 내리는 것이 끝 조건이다.

     node tools/corpse_probe.mjs [분] [씨앗들] [out.json]
     예) node tools/corpse_probe.mjs 12 1,3,9,13
         node tools/corpse_probe.mjs 30 1,3          (최종 판정 — 30분 판)

   씨앗마다 **같은 빌드로 두 번** 돈다: before(globalThis.__NOSINK=1 — 소비처 셋을 끈
   원래 거동) · after(켬). 같은 씨앗이라 유입은 똑같고 **유출만 다르다** — 순수 A/B.
   골격은 loop_health.mjs 그대로(씨앗 고정 · rAF 끊기 · 빨리 감기). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const MIN = +(process.argv[2] || 12);
const SEEDS = (process.argv[3] || "1,3,9,13").split(",").map(Number);
const OUT = process.argv[4] || "/tmp/corpse_probe.json";

console.log(`시간 계획 — 씨앗 ${SEEDS.length}개 × before/after 두 팔 × ${MIN}분(빨리 감기).`);
console.log(`  한 판 실측 ~10-40초 + 페이지 로드 ~7초. 전체 ${SEEDS.length * 2}판.\n`);

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
const allErrs = [];
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") allErrs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));

const seedSrc = (seed, nosink) =>
  `globalThis.__NOSINK = ${nosink ? 1 : 0};
   Math.random = (() => { let s = (${seed} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

/** 한 팔(씨앗×소비처on/off) — 제 탭을 열고 빨리 감아 포화율을 잰다. */
async function runArm(seed, nosink) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed, nosink) });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
  await S("Page.navigate", { url: PAGE });
  await new Promise(r => setTimeout(r, 1500));
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4500));
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await new Promise(r => setTimeout(r, 900));
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await new Promise(r => setTimeout(r, 200));
  await S("Runtime.evaluate", { awaitPromise: true, expression:
    `(async()=>{ const B = await import("/js/battle.js");
       ${seedSrc(seed, nosink)}
       window.__CP = { sat: 0, sum: 0, tot: 0, b40: 0, b50: 0, b70: 0, peak: 0 };
       B.newRun(); return "ok"; })()` });

  const tick = (sec) => `(async()=>{
    const B = await import("/js/battle.js"), C = await import("/js/core.js");
    const S = window.__S, CP = window.__CP, MAXC = B.CORPSE_MAX;
    let n = Math.round(${sec} / 0.05), at = 0;
    for (let i = 0; i < n; i++) {
      try {
        CP.tot++; CP.sum += S.corpses; const c = S.corpses;
        if (c >= MAXC) CP.sat++; if (c >= MAXC * 0.4) CP.b40++; if (c >= MAXC * 0.5) CP.b50++;
        if (c >= MAXC * 0.7) CP.b70++; if (c > CP.peak) CP.peak = c;
        B.step(0.05);
        if ((at += 0.05) > 0.35) { at = 0; window.auto(); }
        if (S.dead) { C.META.runs++; B.newRun(); }
      } catch(e) { return "ERR " + e.message; }
    }
    return JSON.stringify({ 층: S.floor, 최고: C.META.deepest, 시체: S.corpses });
  })()`;

  let last = null;
  for (let m = 1; m <= MIN; m++) {
    const r = await S("Runtime.evaluate", { expression: tick(60), awaitPromise: true, returnByValue: true });
    const v = r.result.value;
    if (typeof v === "string" && v.startsWith("ERR")) { console.log(`  ${m}분 ${v}`); allErrs.push(v); break; }
    last = JSON.parse(v);
  }
  const fin = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression:
    `(async()=>{ const C = await import("/js/core.js"); const CP = window.__CP, S = window.__S;
       const t = Math.max(1, CP.tot);
       return JSON.stringify({ sat: CP.sat / t, avg: CP.sum / t, b40: CP.b40 / t, b50: CP.b50 / t, b70: CP.b70 / t, peak: CP.peak,
         최고: C.META.deepest, use: S.corpseUse || {} }); })()` });
  const o = JSON.parse(fin.result.value);
  await raw("Target.closeTarget", { targetId });
  return o;
}

const rows = [];
for (const seed of SEEDS) {
  const before = await runArm(seed, true);
  const after = await runArm(seed, false);
  const pct = (v) => (v * 100).toFixed(1);
  const useStr = Object.entries(after.use).map(([k, v]) => `${k} ${v}`).join(" · ");
  rows.push({ seed, before, after });
  console.log(`씨앗 ${String(seed).padStart(2)}  포화(=140) b ${pct(before.sat)}%→a ${pct(after.sat)}%` +
              `  · ≥50% b ${pct(before.b50)}%→a ${pct(after.b50)}%  · ≥40% b ${pct(before.b40)}%→a ${pct(after.b40)}%` +
              `  · 평균 ${before.avg.toFixed(0)}→${after.avg.toFixed(0)} · 최고보유 ${before.peak}→${after.peak}` +
              `  · 최고층 ${before.최고}→${after.최고}  · 소비 [${useStr}]`);
}

/* ── 판정 ──
   ★ 실측: 상한(140) 포화는 before 에서 이미 ~0% 다 — 시체 폭발의 gulp(쌓인 만큼 크게
     먹음)이 앞선 커밋에서 「140 붙박이」를 이미 풀어 놨다(평균 보유 ~27). 그래서 판정을
     **한 단계 무른 「≥50% 상한」 밴드**(hoard, 진짜로 쌓이는 시간)로 옮긴다. 그것마저
     원래 낮으면(<3%) 쌓임 자체가 없다는 뜻이라 회귀만 없으면 통과로 본다.
   조건: hoard 밴드 절반 아래(또는 원래 <3%) + 최고층 회귀 없음(-8% 안) + 소비처 셋이
     실제로 돎(각 use>0 이 한 씨앗 이상) + 안 말라 버림 + 오류 0. */
const MAXC = 140;
const bHoard = rows.reduce((a, r) => a + r.before.b50, 0) / rows.length;
const aHoard = rows.reduce((a, r) => a + r.after.b50, 0) / rows.length;
const bSat = rows.reduce((a, r) => a + r.before.sat, 0) / rows.length;
const aSat = rows.reduce((a, r) => a + r.after.sat, 0) / rows.length;
const aAvg = rows.reduce((a, r) => a + r.after.avg, 0) / rows.length;
const regressed = rows.filter(r => r.after.최고 < r.before.최고 * 0.92);
const halved = aHoard <= bHoard / 2 || bHoard < 0.03;
const dried = aAvg < MAXC * 0.10;
const fired = ["burn", "wall", "offer"].filter(k => rows.some(r => (r.after.use[k] | 0) > 0));
const pass = halved && regressed.length === 0 && !dried && fired.length === 3 && !allErrs.length;
console.log(`\n상한(140) 포화  before ${(bSat * 100).toFixed(1)}% → after ${(aSat * 100).toFixed(1)}%  (이미 ~0 — gulp 가 앞서 풀었다)`);
console.log(`쌓임(≥50%) 밴드  before ${(bHoard * 100).toFixed(2)}% → after ${(aHoard * 100).toFixed(2)}%  (절반선 ${(bHoard * 50).toFixed(2)}%)`);
console.log(`after 평균 보유 ${aAvg.toFixed(1)} (상한 ${MAXC}의 ${(aAvg / MAXC * 100).toFixed(0)}%) · 소비처 실제 돎: ${fired.join(",") || "없음"}`);
if (regressed.length) console.log(`최고층 회귀: ${regressed.map(r => `씨${r.seed} ${r.before.최고}→${r.after.최고}`).join(" · ")}`);
console.log(`판정: ${pass ? "PASS" : "FAIL"}` +
            ` (쌓임 절반 ${halved ? "O" : "X"} · 회귀없음 ${regressed.length === 0 ? "O" : "X"} · 셋다돎 ${fired.length === 3 ? "O" : "X"} · 안마름 ${!dried ? "O" : "X"} · 오류 ${allErrs.length})`);
fs.writeFileSync(OUT, JSON.stringify({ MIN, SEEDS, rows, bHoard, aHoard, bSat, aSat, aAvg, fired, pass }, null, 1));
console.log("errors:", allErrs.slice(0, 3));
bws.close();
process.exit(pass ? 0 : 1);
