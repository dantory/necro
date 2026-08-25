/* V-66 — **도킹한 능력치 판이 제 몫을 다 쓰는가.**
   node tools/v66_dockfill.mjs [--shots]

   재는 것 셋 (창 크기 다섯 곳에서 · 한 판 안에서 「전」과 「후」를 갈아 끼워 견준다):
     ① 남긴 빈 폭  — 창(#winStat)이 준 자리 중 판이 안 쓴 폭. 두 판 사이로 맨 땅이 비친다.
     ② 이름 겹침   — `.sStat .tipStat` 의 이름칸(.sN)이 제 글월보다 좁은 줄 수.
                     («한 줄에 하나»를 거두면 여기가 울 수 있다 — 그래서 센다.)
     ③ 숨은 몫     — `#statBody` 에서 굴려야 보이는 몫.

   ★ 「전」은 옛 규칙을 덮개(<style>)로 되살려 **같은 판·같은 저장값**으로 잰다
     ([[same-seed-is-not-same-run]]). 그리고 **「전」이 15% 넘게 울지 않으면 미달**로 낸다 —
     양성 씨앗을 겸한다([[silent-zero-is-not-an-observation]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SHOTS = process.argv.includes("--shots");
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async o => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(o, Buffer.from(s.data, "base64")); };

/* 「몇 시간 논 사람」 — look_shots 와 같은 몸이라야 같은 화면을 본다 */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

/* 옛 규칙 — 판은 내용만큼만 · 수치와 일지는 한 줄에 하나 */
const OFF = `@media (min-width:1200px){
  body.charOpen #winStat .frame{ width:auto }
  body.charOpen #statBody .sStat:not(.jList){ grid-template-columns:1fr; column-gap:0 }
  body.charOpen #statBody .jList{ grid-template-columns:1fr } }`;

const MEASURE = `(()=>{
  const win = document.getElementById('winStat');
  const fr  = win && win.querySelector('.frame');
  const b   = document.getElementById('statBody');
  if (!win || !fr || !b) return null;
  const wr = win.getBoundingClientRect(), fx = fr.getBoundingClientRect();
  /* 창이 준 자리 중 판이 안 쓴 폭 */
  const slot = wr.width, used = fx.width;
  /* 이름칸이 제 글월보다 좁은 줄 = 밟히는 줄 */
  let clipped = 0, rows = 0;
  for (const n of b.querySelectorAll('.sStat .tipStat .sN')) {
    rows++; if (n.scrollWidth - n.clientWidth > 1) clipped++;
  }
  return { slot: Math.round(slot), used: Math.round(used),
           gap: Math.round(slot - used), gapPct: +(100*(slot-used)/slot).toFixed(1),
           rows, clipped,
           sh: b.scrollHeight, ch: b.clientHeight,
           hidPct: +(100*Math.max(0,b.scrollHeight-b.clientHeight)/b.scrollHeight).toFixed(1) };
})()`;

const SIZES = [[1280,620],[1366,768],[1512,863],[1680,1050],[1920,1080]];
const rowsOut = [];
for (const [W,H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SHOTS ? 2 : 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2000);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1600);
  if (!(await ev(`typeof window.__openWin === "function"`)))
    throw new Error("window.__openWin 이 없다 — 자가 능력치 창을 못 연다(이름이 바뀌었나?)");
  await ev(`window.__openWin("stat")`); await wait(600);
  if (!(await ev(`document.body.classList.contains('charOpen')`)))
    throw new Error(W+"x"+H+" — charOpen 이 안 붙었다(도킹한 화면이 아니면 이 자는 뜻이 없다)");

  /* 전 — 옛 규칙을 덮개로 되살린다 */
  await ev(`(()=>{let s=document.getElementById('v66off');if(!s){s=document.createElement('style');s.id='v66off';document.head.appendChild(s);}s.textContent=${JSON.stringify(OFF)};})()`);
  await wait(400);
  const before = await ev(MEASURE);
  if (SHOTS) await shot(`tmp/v66_${W}x${H}_before.png`);
  /* 후 — 덮개를 걷는다 */
  await ev(`(()=>{const s=document.getElementById('v66off');if(s)s.textContent='';})()`);
  await wait(400);
  const after = await ev(MEASURE);
  if (SHOTS) await shot(`tmp/v66_${W}x${H}_after.png`);
  if (!before || !after) throw new Error(W+"x"+H+" — 잴 것을 못 찾았다");
  rowsOut.push({ size: `${W}x${H}`, before, after });
  console.log(`${W}x${H}  빈폭 ${before.gap}px(${before.gapPct}%) → ${after.gap}px(${after.gapPct}%)`
    + ` · 겹침 ${before.clipped}/${before.rows} → ${after.clipped}/${after.rows}`
    + ` · 숨은몫 ${before.hidPct}% → ${after.hidPct}%`);
}
await S("Target.closeTarget", { targetId });

const avgBefore = rowsOut.reduce((a,r)=>a+r.before.gapPct,0)/rowsOut.length;
const worstGapAfter = Math.max(...rowsOut.map(r=>r.after.gapPct));
const clipAfter = rowsOut.reduce((a,r)=>a+r.after.clipped,0);
const worstHidAfter = Math.max(...rowsOut.map(r=>r.after.hidPct));
const seedOk = avgBefore >= 15;
/* 숨은 몫은 **이 항목의 주장이 아니다**(주장은 「판이 제 몫을 안 쓴다」). 다만 폭이 제자리로
   오면 줄이 두 칸으로 접히므로 **나빠질 수는 없다** — 한 크기라도 나빠지면 미달로 낸다.
   ★ 남은 숨은 몫은 **일지의 긴 꼬리**다(ROADMAP 의 열린 항목). 조용히 덮지 않고 적는다. */
const worse = rowsOut.filter(r => r.after.hidPct > r.before.hidPct + 0.5).map(r => r.size);
const pass = seedOk && worstGapAfter <= 1 && clipAfter === 0 && worse.length === 0 && errs.length === 0;
console.log("errs", errs);
console.log(`씨앗(전 평균 빈폭) ${avgBefore.toFixed(1)}% ${seedOk ? "ok" : "← 15% 를 못 넘는다: 자가 「전」을 못 되살렸다"}`);
console.log(`후 — 최악 빈폭 ${worstGapAfter}% · 밟히는 줄 ${clipAfter} · 숨은몫이 나빠진 크기 ${worse.length ? worse.join(",") : "없음"}`);
console.log(`※ 남은 숨은 몫(굴려야 보이는 몫) — ` + rowsOut.map(r=>`${r.size} ${r.after.hidPct}%`).join(" · ") + "  ← 일지의 긴 꼬리, 이 항목 밖");
console.log("판정:", pass ? "통과" : "미달");
process.exit(pass ? 0 : 1);
