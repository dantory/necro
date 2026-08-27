/* V-127 눈 — **같은 사람 · 같은 순간**에 문(`__OFFOLD`)만 여닫아 옛것과 지금을 나란히 찍는다.
   사흘(77시간) 비우고 돌아온 34층 사람. 위 옛것 · 아래 지금. */
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
await S("Page.navigate", { url: URL }); await wait(1400);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;M.lv=46;M.gold=50000;M.deepest=34;M.best=34;M.corpses=120;M.up={hp:6,mp:4,dmg:7,army:3};C.saveMeta();
  const k="necro.meta.v1",o=JSON.parse(localStorage.getItem(k));o.lastSeen=Date.now()-${H}*3600e3;localStorage.setItem(k,JSON.stringify(o));return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2700);
/* 창 상자만 오려 낸다 — 마을 배경까지 담으면 글월이 안 읽힌다. */
/* ★ `#winOffline` 은 **화면 전체를 덮는 껍데기**다 — 그걸 오리면 마을이 통째로 담긴다.
   글이 실린 상자(`#offBody`)를 기준으로 위아래를 넉넉히 벌려 «창»만 잡는다. */
const box = await ev(`(()=>{const r=document.getElementById('offBody').getBoundingClientRect();
  return {x:Math.round(r.x)-40,y:Math.round(r.y)-150,width:Math.round(r.width)+80,height:Math.round(r.height)+230};})()`);
const grab = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 } }); fs.writeFileSync("tmp/v127_" + n + ".png", Buffer.from(data, "base64")); };
await ev(`(()=>{globalThis.__OFFOLD=1;window.__openWin("offline");window.__openWin("offline");return 1})()`); await wait(400);
console.log("옛  " + JSON.stringify(await ev(`document.getElementById('offBody').innerText.replace(/\\n/g,' | ')`)));
await grab("cmp_old");
await ev(`(()=>{delete globalThis.__OFFOLD;window.__openWin("offline");window.__openWin("offline");return 1})()`); await wait(400);
console.log("지금 " + JSON.stringify(await ev(`document.getElementById('offBody').innerText.replace(/\\n/g,' | ')`)));
await grab("cmp_new");
await S("Target.closeTarget", { targetId });
process.exit(0);
