/* V-119 눈 — **같은 사람 · 같은 순간**에 문만 여닫아 옛것과 지금을 나란히 찍는다.
   위 옛것(「그동안 8시간」) · 아래 지금(「그동안 3일 5시간」). */
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
const H = 77;
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;M.lv=46;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=0;M.relics=7;M.rebirths=2;M.up={hp:12,mp:9,dmg:14,army:6};C.saveMeta();
  const k="necro.meta.v1",o=JSON.parse(localStorage.getItem(k));o.lastSeen=Date.now()-${H}*3600e3;localStorage.setItem(k,JSON.stringify(o));return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2700);
const grab = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v119_" + n + ".png", Buffer.from(data, "base64")); };
/* 옛 결 먼저 — 문을 켜고 닫았다 다시 연다(한 번만 부르면 토글로 닫힌다). */
await ev(`(()=>{globalThis.__AWAYOLD=1;window.__openWin("offline");window.__openWin("offline");return 1})()`); await wait(400);
console.log("옛 " + JSON.stringify(await ev(`document.getElementById('offBody').innerText.split('\\n')[0]`)));
await grab("cmp_old");
await ev(`(()=>{delete globalThis.__AWAYOLD;window.__openWin("offline");window.__openWin("offline");return 1})()`); await wait(400);
console.log("지금 " + JSON.stringify(await ev(`document.getElementById('offBody').innerText.split('\\n')[0]`)));
await grab("cmp_new");
await S("Target.closeTarget", { targetId });
process.exit(0);
