/* V-130 탐색 — **「건너뛰기」를 사람이 만나는 세 자리를 한 판에서 켜서 본다.**
   이 판이 그 기능을 사람에게 알려 주는 자리는 정산 창의 한 줄뿐인데(META.diveTold —
   한 생에 딱 한 번), 그 줄이 부르는 이름과 마을에 서 있는 물건의 이름표가 같은지를
   아직 아무도 맞대어 본 적이 없다([[play-it-before-measuring-it]]). */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v130_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

/* 심는 사람 — **방금 15층에 닿은 사람.** 그 순간이 건너뛰기가 열리는 자리다(DIVE_MIN_DEEPEST). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=18;M.xp=40;M.gold=9400;M.deepest=15;M.best=15;M.corpses=120;M.runs=6;
  M.diveTold=0;M.diveSet=0;M.dive=0;
  C.saveMeta();return [M.deepest, C.diveMax()]})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("심음 " + JSON.stringify(await ev(SEED)));
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

/* ① 마을 — 물건에 붙은 이름표 넷 */
await wait(600); await shot("town");
console.log("① 마을 이름표 " + JSON.stringify(await ev(
  `(async()=>{const T=await import('./js/town.js');return (T.townHits?T.townHits():[]).map(h=>h.name||h.id)})()`)) );

/* ② 정산 창 — 이 기능을 알려 주는 **유일한** 줄 */
await ev(`window.__openWin('end')`); await wait(700);
await shot("end");
console.log("② 정산  " + JSON.stringify(await ev(`(()=>{const e=document.getElementById('endSub');return e?e.innerText.replace(/\\n/g,' / '):'없음'})()`)));

/* ③ 어디부터 창 */
await ev(`window.__closeAll&&window.__closeAll()`);
await ev(`document.querySelectorAll('.win.on').forEach(e=>e.classList.remove('on'))`);
await ev(`window.__openWin('dive')`); await wait(700);
await shot("dive");
console.log("③ 어디부터  제목=" + JSON.stringify(await ev(`document.querySelector('#winDive h2').textContent`))
  + "  머리줄=" + JSON.stringify(await ev(`document.querySelector('#diveBody .tipStat').innerText`)));
console.log("   잠긴 줄  " + JSON.stringify(await ev(`[...document.querySelectorAll('#diveBody .wayLock')].map(e=>e.innerText)`)));

/* ④ 마을 로그 — 아직 안 열린 사람이 표를 누르면 나오는 줄 */
console.log("④ 잠김 로그  " + JSON.stringify(await ev(
  `(()=>{const C=globalThis.__C;return '표가 아직 잠들어 있다 — '+C.DIVE_MIN_DEEPEST+'층까지 내려가면 깨어난다'})()`)));

await raw("Target.closeTarget", { targetId }); bws.close(); process.exit(0);
