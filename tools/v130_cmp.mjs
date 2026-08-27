/* V-130 켜서 보기 — **같은 사람 · 같은 순간**에 문(`__WAYNAME_OLD`)만 여닫아 두 장을 찍는다.
   ㉠ 정산 창의 안내(한 생에 한 번 나가는 그 줄) ㉡ 어디부터 창의 머리줄·잠긴 줄. */
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v130_" + n + ".png", Buffer.from(data, "base64")); };

const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=18;M.xp=40;M.gold=9400;M.deepest=15;M.best=15;M.corpses=120;M.runs=6;
  M.diveTold=0;M.diveSet=0;M.dive=0;C.saveMeta();return C.diveMax()})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1366, height: 700, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

/* 같은 판을 두 번 그린다 — 문만 여닫는다. diveTold 는 한 번 켜지면 안 나오므로 매번 되돌린다. */
for (const [tag, old] of [["old", 1], ["new", 0]]) {
  await ev(`globalThis.__WAYNAME_OLD=${old}; globalThis.__C.META.diveTold=0; globalThis.__C.saveMeta(); 1`);
  await ev(`window.__closeAll&&window.__closeAll()`);
  await ev(`document.querySelectorAll('.win.on').forEach(e=>e.classList.remove('on'))`);
  await ev(`window.__openWin('end')`); await wait(700); await shot("end_" + tag);
  await ev(`window.__closeAll&&window.__closeAll()`);
  await ev(`document.querySelectorAll('.win.on').forEach(e=>e.classList.remove('on'))`);
  await ev(`window.__openWin('dive')`); await wait(700); await shot("dive_" + tag);
  console.log(tag + " 찍음");
}
await raw("Target.closeTarget", { targetId }); bws.close(); process.exit(0);
