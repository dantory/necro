/* 한 판이 «끝날 때» 사람이 보는 창들을 찍는다 (V-50 고르기용).
     node tools/v50_look.mjs
   새 저장 → 던전 40초 → 정산·환생·건너뛰기·자리비움·밀어내기 창을 찍는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v50_${n}.png`, Buffer.from(data, "base64")); console.log(`tmp/v50_${n}.png`); };
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2500);
await ev(`localStorage.clear()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`window.__toDungeon()`); await wait(40000);
console.log(JSON.stringify(await ev(`({at:(window.MODE||{}).at, f:(window.S||{}).floor})`)));
/* 정산은 LASTRUN 이 있어야 그린다 — 판을 실제로 접어 채운다 */
await ev(`window.__die && window.__die()`); await wait(1800);
await shot("town"); 
for (const w of ["end", "reborn", "dive", "wipe", "offline"]) {
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(600); await shot(w);
  await ev(`window.__openWin(null)`); await wait(200);
}
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
