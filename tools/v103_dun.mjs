/* V-103 — **처음 켠 사람이 처음 내려가는 1층을 켜서 본다.** V-99~V-102 는 창만 봤다.
   정작 사람이 오래 보는 것은 아래 판이다. 저장을 지우고 관문으로 내려가 20초를 논다.
   쓰기: node tools/v103_dun.mjs [초] [width] [height]      (tmp/v103_dun*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 20), W = +(process.argv[3] || 1512), H = +(process.argv[4] || 863);
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await shot("tmp/v103_dun_town.png");
await ev(`window.__toDungeon()`); await wait(1200);
await shot("tmp/v103_dun_00.png");
for (let i = 1; i <= 3; i++) { await wait((SEC * 1000) / 3); await shot(`tmp/v103_dun_${i}0.png`); }
console.log(JSON.stringify(await ev(`(()=>({ 층:(document.querySelector("#top .dep")||{}).textContent,
  머리:(document.querySelector("#top")||{}).innerText, 밑:(document.querySelector("#hud")||document.querySelector(".hudBar")||{}).innerText })) ()`), null, 1));
if (errs.length) console.log("예외:", errs.slice(0, 5));
await raw("Target.closeTarget", { targetId }); bws.close();
