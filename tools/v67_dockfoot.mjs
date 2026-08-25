/* V-67 — **도킹한 두 판의 아래 끝이 맞는가.**
   node tools/v67_dockfoot.mjs [--shots]

   재는 것 넷 (창 크기 다섯 곳에서 · 한 판 안에서 「전」과 「후」를 갈아 끼워 견준다):
     ① 아래 끝 어긋남 — |능력치 판 바닥 − 가방 판 바닥|. 짧은 쪽 밑으로 판 밖(마을·던전)이 비친다.
     ② 격자 쏠림     — 가방 판 안에서 «머리글 위 여백 − 격자 아래 여백». 판을 늘리면 V-64 가 미워한
                       «격자 아래 검은 바닥»이 돌아올 수 있으므로, 늘린 자리를 위아래로 나눴는지 센다.
     ③ 칸 정사각     — 가방 칸의 가로/세로. 이 항목은 칸을 안 건드리므로 **나빠지지만 않으면** 된다
                       (지금 값이 0.96~0.98 로 이미 1.00 이 아니다 — 그것은 V-59 의 자리다).
     ④ 숨은 몫       — `#statBody` 에서 굴려야 보이는 몫. 이 항목이 건드리는 곳이 아니므로
                       **나빠지면 미달**로 낸다.

   ★ 「전」은 V-64 의 규칙(가방 판은 제 몸에 맞게 끝난다)을 덮개(<style>)로 되살려
     **같은 판·같은 저장값**으로 잰다([[same-seed-is-not-same-run]]).
     그리고 **「전」의 어긋남이 100px 를 넘지 않으면 미달**로 낸다 — 양성 씨앗을 겸한다
     ([[silent-zero-is-not-an-observation]]). */
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

/* 「몇 시간 논 사람」 — look_shots·v66 과 같은 몸이라야 같은 화면을 본다.
   가방은 비어 둔다 — 이 자가 재는 것은 «판의 크기»지 «담긴 것»이 아니고, 빈 칸도
   격자 칸으로 서 있으므로 칸비는 그대로 잡힌다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

/* 전 — V-64 의 「가방 판은 제 몸에 맞게 끝난다」를 되살린다(그리고 가운데 정렬을 걷는다) */
const OFF = `@media (min-width:1200px){
  body.charOpen #winBag{ align-items:flex-start }
  body.charOpen #winBag .frame{ height:auto; max-height:100% }
  body.charOpen #winBag .sSec.bag{ display:block } }`;

const MEASURE = `(()=>{
  const fS = document.querySelector('#winStat .frame');
  const fB = document.querySelector('#winBag .frame');
  const sec = document.querySelector('#winBag .sSec.bag');
  const grid = sec && sec.querySelector('.grid');
  const cell = grid && grid.querySelector('.cell');
  const foot = document.querySelector('#winBag .winFoot');
  const head = sec && sec.querySelector('h3');
  const body = document.getElementById('statBody');
  if (!fS || !fB || !grid || !cell || !foot || !head || !body) return null;
  const rS = fS.getBoundingClientRect(), rB = fB.getBoundingClientRect();
  const rG = grid.getBoundingClientRect(), rC = cell.getBoundingClientRect(), rF = foot.getBoundingClientRect();
  const rH = head.getBoundingClientRect();
  const bodyB = document.getElementById('bagBody').getBoundingClientRect();
  return { step: Math.round(Math.abs(rS.bottom - rB.bottom)),
           statH: Math.round(rS.height), bagH: Math.round(rB.height),
           padTop: Math.round(rH.top - bodyB.top), padBot: Math.round(rF.top - rG.bottom),
           cellAr: +(rC.width / rC.height).toFixed(3),
           sh: body.scrollHeight, ch: body.clientHeight,
           hidPct: +(100*Math.max(0,body.scrollHeight-body.clientHeight)/body.scrollHeight).toFixed(1) };
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

  await ev(`(()=>{let s=document.getElementById('v67off');if(!s){s=document.createElement('style');s.id='v67off';document.head.appendChild(s);}s.textContent=${JSON.stringify(OFF)};})()`);
  await wait(400);
  const before = await ev(MEASURE);
  if (SHOTS) await shot(`tmp/v67_${W}x${H}_before.png`);
  await ev(`(()=>{const s=document.getElementById('v67off');if(s)s.textContent='';})()`);
  await wait(400);
  const after = await ev(MEASURE);
  if (SHOTS) await shot(`tmp/v67_${W}x${H}_after.png`);
  if (!before || !after) throw new Error(W+"x"+H+" — 잴 것을 못 찾았다");
  rowsOut.push({ size: `${W}x${H}`, before, after });
  console.log(`${W}x${H}  어긋남 ${before.step}px → ${after.step}px`
    + ` · 격자쏠림 ${before.padTop}/${before.padBot} → ${after.padTop}/${after.padBot}`
    + ` · 칸비 ${before.cellAr} → ${after.cellAr}`
    + ` · 숨은몫 ${before.hidPct}% → ${after.hidPct}%`);
}
await S("Target.closeTarget", { targetId });

const avgStepBefore = rowsOut.reduce((a,r)=>a+r.before.step,0)/rowsOut.length;
const worstStepAfter = Math.max(...rowsOut.map(r=>r.after.step));
const worstSkewAfter = Math.max(...rowsOut.map(r=>Math.abs(r.after.padTop - r.after.padBot)));
const worstArDrift = Math.max(...rowsOut.map(r=>Math.abs(r.after.cellAr - r.before.cellAr)));
const worse = rowsOut.filter(r => r.after.hidPct > r.before.hidPct + 0.5).map(r => r.size);
const seedOk = avgStepBefore >= 100;
const pass = seedOk && worstStepAfter <= 2 && worstSkewAfter <= 24 && worstArDrift <= 0.005
             && worse.length === 0 && errs.length === 0;
console.log("errs", errs);
console.log(`씨앗(전 평균 어긋남) ${avgStepBefore.toFixed(0)}px ${seedOk ? "ok" : "← 100px 를 못 넘는다: 자가 「전」을 못 되살렸다"}`);
console.log(`후 — 최악 어긋남 ${worstStepAfter}px · 최악 쏠림 ${worstSkewAfter}px · 칸비 흔들림 ${worstArDrift.toFixed(3)}`
  + ` · 숨은몫이 나빠진 크기 ${worse.length ? worse.join(",") : "없음"}`);
console.log("판정:", pass ? "통과" : "미달");
process.exit(pass ? 0 : 1);
