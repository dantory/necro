/* ══ V-64 자 — **가방 판 아래의 빈 바닥**을 잰다 ══
   묻는 것: 「격자가 끝난 뒤로 판 안에 몇 px 이 비어 있나」 = 상자 아래 여백 / 상자 높이.
   ★ 한 판에서 전/후를 다 잰다 — 「전」은 예전 규칙(`height:100%`)을 덮어씌워 되살린 것이다.
     그래야 창 크기·글꼴·저장값이 **똑같은** 채로 견줄 수 있다([[same-seed-is-not-same-run]]).
   ★ 「전」이 0 을 뱉으면 그건 통과가 아니라 **자가 고장난 것**이다 — 양성 씨앗을 겸한다
     ([[silent-zero-is-not-an-observation]]). 그래서 판정에 «전이 울었는가»를 같이 싣는다.
   node tools/v64_baghole.mjs [--shots]      (--shots 면 tmp/v64_{before,after}_<w>x<h>.png)  */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const SHOTS = process.argv.includes("--shots");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2600);

/* 「전」을 되살리는 덮개 — 이 한 줄이 V-64 이전의 규칙 그대로다 */
const OLD = `@media (min-width:1200px){ body.charOpen #winBag{align-items:stretch!important}
             body.charOpen #winBag .frame{height:100%!important;max-height:none!important} }`;
await ev(`(()=>{const s=document.createElement("style");s.id="v64old";s.textContent=${JSON.stringify(OLD)};
  s.disabled=true;document.head.appendChild(s);return 1})()`);

const measure = () => ev(`(()=>{const win=document.getElementById('winBag');
  if(!win.classList.contains('on')) return {open:false};
  const fr=win.querySelector('.frame'), body=document.getElementById('bagBody');
  const grid=body.querySelector('.sSec.bag .grid');
  const fb=fr.getBoundingClientRect(), rb=body.getBoundingClientRect(), gb=grid.getBoundingClientRect();
  /* 상자 안에서 «무엇이든 그려진 것»의 맨 아래 — 격자가 마지막이 아닐 수도 있으므로 훑는다 */
  let deep=rb.top; for(const e of body.querySelectorAll('*')){const r=e.getBoundingClientRect();
    if(r.height>1&&r.bottom>deep&&r.bottom<=rb.bottom+1)deep=r.bottom;}
  const cell=(gb.width-parseFloat(getComputedStyle(grid).columnGap||0)*9)/10;
  return {open:true, frameH:Math.round(fb.height), bodyH:Math.round(rb.height),
    gridH:Math.round(gb.height), cell:+cell.toFixed(1),
    hole:Math.round(rb.bottom-deep), over:body.scrollHeight>body.clientHeight+1,
    footTop:Math.round(fr.querySelector('.winFoot').getBoundingClientRect().top-fb.top)};})()`);

const SIZES = [[1280,620],[1280,800],[1366,768],[1440,900],[1512,860],[1680,1050],[1920,1080]];
const rows = [];
for (const [w, h] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await wait(320);
  const r = {};
  for (const state of ["before", "after"]) {
    await ev(`(()=>{document.getElementById("v64old").disabled=${state === "after"};
      document.querySelectorAll(".win.on").forEach(x=>x.classList.remove("on"));
      window.__openWin("bag"); return 1})()`);
    await wait(420);
    await ev(`window.__fitBagGrid&&window.__fitBagGrid()`); await wait(120);
    r[state] = await measure();
    if (SHOTS) { const s = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(`tmp/v64_${state}_${w}x${h}.png`, Buffer.from(s.data, "base64")); }
  }
  rows.push({ w, h, ...r });
}
const pct = m => m.open ? Math.round(100 * m.hole / m.bodyH) : -1;
console.log("창        전:빈바닥          후:빈바닥         칸(전→후)  넘침");
for (const r of rows)
  console.log(`${String(r.w+"×"+r.h).padEnd(10)} ${String(r.before.hole+"px "+pct(r.before)+"%").padEnd(18)} `
    + `${String(r.after.hole+"px "+pct(r.after)+"%").padEnd(17)} ${r.before.cell}→${r.after.cell}   `
    + `${r.before.over?"전":""}${r.after.over?"후":""}${r.before.over||r.after.over?"":"없음"}`);
const worstBefore = Math.max(...rows.map(r => pct(r.before)));
const worstAfter  = Math.max(...rows.map(r => pct(r.after)));
const shrank = rows.every(r => r.after.cell >= r.before.cell - 0.6);
const noOver = rows.every(r => !r.after.over);
console.log(`errs ${JSON.stringify(errs)}`);
/* 「전」이 안 울면 자가 고장난 것이다 — 통과로 읽지 않는다 */
const ruler = worstBefore >= 15;
console.log(`자 점검: 「전」의 최악 ${worstBefore}% ${ruler ? "— 운다(자가 살아 있다)" : "— ★ 안 운다. 자가 고장났다"}`);
const ok = ruler && worstAfter <= 6 && shrank && noOver && !errs.length;
console.log(`판정: ${ok ? "통과" : "미달"} (최악 빈바닥 ${worstBefore}% → ${worstAfter}% · 칸 안 줄어듦 ${shrank} · 넘침 ${!noOver})`);
process.exitCode = ok ? 0 : 1;
await S("Target.closeTarget", { targetId }).catch(() => {}); bws.close();
